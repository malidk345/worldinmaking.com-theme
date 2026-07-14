"use client";

import React, { useEffect, useState, useRef } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ListNode, ListItemNode } from "@lexical/list";
import { LinkNode } from "@lexical/link";
import { CodeNode, CodeHighlightNode } from "@lexical/code";
import { $getRoot, $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND } from "lexical";
import { $generateNodesFromDOM, $generateHtmlFromNodes } from "@lexical/html";
import { $setBlocksType } from "@lexical/selection";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $createParagraphNode } from "lexical";
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from "@lexical/list";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";

import { IconCode, IconDocument, IconExternal, IconList, IconMinus, IconMinusSmall, IconMinusSquare, IconQuote, IconTextWidth, IconTextWidthFixed } from '@posthog/icons';;

// Theme configuration matching iOS 26 premium, minimalist design
const theme = {
    paragraph: "apple-body mb-4 dark:text-zinc-200",
    heading: {
        h1: "apple-h1 mt-8 mb-4 dark:text-zinc-50",
        h2: "text-xl md:text-2xl font-extrabold mt-4 mb-2 tracking-tight text-zinc-900 dark:text-zinc-100 lowercase",
        h3: "text-lg md:text-xl font-bold mt-3.5 mb-1.5 text-zinc-800 dark:text-zinc-200 lowercase",
    },
    list: {
        ul: "list-disc pl-6 mb-3 space-y-1 lowercase",
        ol: "list-decimal pl-6 mb-3 space-y-1 lowercase",
        nested: {
            listitem: "list-none",
        },
        listitem: "text-sm md:text-base leading-relaxed text-zinc-800 dark:text-zinc-200 lowercase",
    },
    quote: "border-l-[3px] border-zinc-300 dark:border-zinc-700 pl-4 italic my-3 text-zinc-500 dark:text-zinc-400 lowercase",
    text: {
        bold: "font-black text-zinc-950 dark:text-zinc-50",
        italic: "italic",
        underline: "underline decoration-zinc-400",
        strikethrough: "line-through decoration-zinc-400",
        code: "apple-code bg-zinc-100 dark:bg-zinc-800 rounded px-1 py-0.5",
    },
    link: "text-zinc-950 dark:text-zinc-50 underline decoration-zinc-400 hover:decoration-zinc-950 cursor-pointer transition-colors duration-150 font-bold",
};

const initialConfig = {
    namespace: "PostLexicalEditor",
    theme,
    nodes: [
        HeadingNode,
        QuoteNode,
        ListNode,
        ListItemNode,
        LinkNode,
        CodeNode,
        CodeHighlightNode,
    ],
    onError(error: Error) {
        console.error("Lexical error:", error);
    },
};

// Plugin to load initial HTML string into Lexical
function InitialStatePlugin({ html }: { html: string }) {
    const [editor] = useLexicalComposerContext();
    const isInitializedRef = useRef(false);

    useEffect(() => {
        if (!isInitializedRef.current && html) {
            editor.update(() => {
                const parser = new DOMParser();
                const dom = parser.parseFromString(html, "text/html");
                const nodes = $generateNodesFromDOM(editor, dom);
                
                const root = $getRoot();
                root.clear();
                root.append(...nodes);
            });
            isInitializedRef.current = true;
        }
    }, [editor, html]);

    return null;
}

// Plugin to sync changes as HTML string back to parent state
function OnChangeHTMLPlugin({ onChange }: { onChange: (html: string) => void }) {
    const [editor] = useLexicalComposerContext();
    return (
        <OnChangePlugin
            onChange={(editorState) => {
                editorState.read(() => {
                    const html = $generateHtmlFromNodes(editor, null);
                    // Avoid triggering parent state loop if empty paragraph
                    onChange(html === "<p></p>" ? "" : html);
                });
            }}
        />
    );
}

// Custom Toolbar Plugin with crisp lucide icons and smooth animations
function CustomToolbar() {
    const [editor] = useLexicalComposerContext();
    const [activeBlock, setActiveBlock] = useState("paragraph");
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);

    useEffect(() => {
        return editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    setIsBold(selection.hasFormat("bold"));
                    setIsItalic(selection.hasFormat("italic"));
                    setIsUnderline(selection.hasFormat("underline"));
                    setIsStrikethrough(selection.hasFormat("strikethrough"));
                    
                    const anchorNode = selection.anchor.getNode();
                    const element = anchorNode.getKey() === "root" 
                        ? anchorNode 
                        : anchorNode.getTopLevelElementOrThrow();
                    const type = element.getType();
                    setActiveBlock(type);
                }
            });
        });
    }, [editor]);

    const formatHeading = (headingSize: "h1" | "h2") => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                if (activeBlock === headingSize) {
                    $setBlocksType(selection, () => $createParagraphNode());
                } else {
                    $setBlocksType(selection, () => $createHeadingNode(headingSize));
                }
            }
        });
    };

    const formatQuote = () => {
        editor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                if (activeBlock === "quote") {
                    $setBlocksType(selection, () => $createParagraphNode());
                } else {
                    $setBlocksType(selection, () => $createQuoteNode());
                }
            }
        });
    };

    const formatList = (listType: "bullet" | "number") => {
        if (listType === "bullet") {
            if (activeBlock === "bullet") {
                editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
            } else {
                editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
            }
        } else {
            if (activeBlock === "number") {
                editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
            } else {
                editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
            }
        }
    };

    const insertLink = () => {
        const url = prompt("enter url:");
        if (url !== null) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, url || null);
        }
    };

    const buttonClass = (active: boolean) => `
        p-1.5 sm:p-2 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 
        hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all duration-200 active:scale-95
        ${active ? "!text-zinc-950 dark:!text-zinc-50 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm" : "border border-transparent"}
    `;

    return (
        <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-md sticky top-0 z-10 select-none">
            {/* Inline Formatting */}
            <button
                type="button"
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
                className={buttonClass(isBold)}
                title="bold"
            >
                <IconTextWidthFixed className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>
            <button
                type="button"
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
                className={buttonClass(isItalic)}
                title="italic"
            >
                <IconMinusSmall className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>
            <button
                type="button"
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")}
                className={buttonClass(isUnderline)}
                title="underline"
            >
                <IconMinus className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>
            <button
                type="button"
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")}
                className={buttonClass(isStrikethrough)}
                title="strikethrough"
            >
                <IconMinusSquare className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>

            <span className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1.5" />

            {/* Block Formatting */}
            <button
                type="button"
                onClick={() => formatHeading("h1")}
                className={buttonClass(activeBlock === "h1")}
                title="heading 1"
            >
                <IconTextWidth className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>
            <button
                type="button"
                onClick={() => formatHeading("h2")}
                className={buttonClass(activeBlock === "h2")}
                title="heading 2"
            >
                <IconTextWidth className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>
            <button
                type="button"
                onClick={() => formatList("bullet")}
                className={buttonClass(activeBlock === "bullet" || activeBlock === "unordered-list")}
                title="bullet list"
            >
                <IconList className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>
            <button
                type="button"
                onClick={() => formatList("number")}
                className={buttonClass(activeBlock === "number" || activeBlock === "ordered-list")}
                title="numbered list"
            >
                <IconList className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>
            <button
                type="button"
                onClick={formatQuote}
                className={buttonClass(activeBlock === "quote")}
                title="quote"
            >
                <IconQuote className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>
            <button
                type="button"
                onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
                className={buttonClass(activeBlock === "code")}
                title="code block"
            >
                <IconCode className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>

            <span className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1.5" />

            {/* Actions */}
            <button
                type="button"
                onClick={insertLink}
                className={buttonClass(false)}
                title="link"
            >
                <IconExternal className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>
            <button
                type="button"
                onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")}
                className={buttonClass(false)}
                title="align left"
            >
                <IconDocument className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>
            <button
                type="button"
                onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")}
                className={buttonClass(false)}
                title="align center"
            >
                <IconDocument className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>
            <button
                type="button"
                onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")}
                className={buttonClass(false)}
                title="align right"
            >
                <IconDocument className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[2.5]" />
            </button>
        </div>
    );
}

interface PostLexicalEditorProps {
    initialValue: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
}

export default function PostLexicalEditor({
    initialValue,
    onChange,
    placeholder = "start typing your story here...",
    className = ""
}: PostLexicalEditorProps) {
    return (
        <LexicalComposer initialConfig={initialConfig}>
            <div className={`relative flex flex-col w-full h-full min-h-0 bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden group focus-within:border-black/10 dark:focus-within:border-white/10 transition-all duration-300 ${className}`}>
                {/* Formatting Toolbar */}
                <CustomToolbar />

                {/* Spacious Writing Canvas */}
                <div className="relative flex-1 overflow-y-auto no-scrollbar min-h-0">
                    <RichTextPlugin
                        contentEditable={
                            <ContentEditable 
                                className="apple-body outline-none focus:outline-none p-5 sm:p-7 dark:text-zinc-200 h-full min-h-[300px] antialiased"
                            />
                        }
                        placeholder={
                            <div className="absolute top-5 left-5 sm:top-7 sm:left-7 text-zinc-400 dark:text-zinc-500 pointer-events-none select-none text-sm md:text-base lowercase font-bold">
                                {placeholder}
                            </div>
                        }
                        ErrorBoundary={(props) => (
                            <div className="p-4 text-red-500 text-xs font-mono">{props.children}</div>
                        )}
                    />
                    
                    <HistoryPlugin />
                    <ListPlugin />
                    <LinkPlugin />
                    <InitialStatePlugin html={initialValue} />
                    <OnChangeHTMLPlugin onChange={onChange} />
                </div>
            </div>
        </LexicalComposer>
    );
}
