declare module 'cntl' {
    export default function cntl(
        strings: TemplateStringsArray,
        ...values: unknown[]
    ): string;
}
