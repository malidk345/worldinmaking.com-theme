import React from 'react';
import { SidePanel } from '../../LemonUI/LemonDrawer/LemonDrawer';
import { LemonButton } from '../../LemonUI/LemonButton/LemonButton';
import { LemonTag } from '../../LemonUI/LemonTag/LemonTag';
import { LemonSkeleton } from '../../LemonUI/LemonSkeleton/LemonSkeleton';
import { IconDownload, IconRefresh, IconWarning } from '@posthog/icons';

export type ExportFormat = 'CSV' | 'PNG' | 'PDF' | 'XLSX' | 'JSON';

export interface ExportAsset {
  id: string;
  filename: string;
  format: ExportFormat;
  createdAt: string;
  expiresAfter?: string;
  status: 'pending' | 'ready' | 'error';
  downloaded?: boolean;
}

export interface SidePanelExportsProps {
  isOpen: boolean;
  onClose: () => void;
  exports?: ExportAsset[];
  loading?: boolean;
  onRefresh?: () => void;
  onDownload?: (asset: ExportAsset) => void;
}

const FORMAT_COLORS: Record<ExportFormat, 'success' | 'warning' | 'primary' | 'muted'> = {
  CSV: 'success',
  PNG: 'primary',
  PDF: 'warning',
  XLSX: 'success',
  JSON: 'muted',
};

export function SidePanelExports({
  isOpen,
  onClose,
  exports: exportsList = [],
  loading = false,
  onRefresh,
  onDownload,
}: SidePanelExportsProps) {
  const sampleExports: ExportAsset[] =
    exportsList.length > 0
      ? exportsList
      : [
          { id: '1', filename: 'funnel-analysis-q3.csv', format: 'CSV', createdAt: '5m ago', expiresAfter: '7 days', status: 'ready' },
          { id: '2', filename: 'dashboard-screenshot.png', format: 'PNG', createdAt: '1h ago', expiresAfter: '6mo', status: 'ready', downloaded: true },
          { id: '3', filename: 'user-cohort-export.csv', format: 'CSV', createdAt: '2h ago', status: 'pending' },
        ];

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          <IconDownload className="size-4 text-[var(--primary-3000)]" />
          Exports
        </span>
      }
      description="Download your asynchronously generated exports"
      width="26rem"
    >
      <div className="flex flex-col gap-3 py-2">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-3000)]">
          <p className="text-xs text-[var(--muted-3000)] leading-relaxed">
            Exports are generated asynchronously and auto-deleted after a period.
          </p>
          <LemonButton
            icon={<IconRefresh className={`size-3.5${loading ? ' animate-spin' : ''}`} />}
            size="small"
            type="tertiary"
            onClick={onRefresh}
            aria-label="Refresh exports"
            title="Refresh exports"
          />
        </div>

        {/* List */}
        {loading && sampleExports.length === 0 ? (
          <LemonSkeleton repeat={4} />
        ) : sampleExports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-[var(--muted-3000)]">
            <IconDownload className="size-8 opacity-30" />
            <span className="text-xs">No exports yet.</span>
          </div>
        ) : (
          sampleExports.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between gap-2 p-3 rounded border border-[var(--border-3000)] bg-[var(--color-bg-surface-primary)]"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-xs font-semibold text-[var(--text-3000)] truncate">{asset.filename}</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <LemonTag type={FORMAT_COLORS[asset.format] ?? 'muted'} size="small">
                    {asset.format}
                  </LemonTag>
                  <span className="text-[10px] text-[var(--muted-3000)] font-mono">{asset.createdAt}</span>
                  {asset.expiresAfter && (
                    <span className="text-[10px] text-[var(--muted-3000)]">· expires in {asset.expiresAfter}</span>
                  )}
                  {!asset.downloaded && asset.status === 'ready' && (
                    <span className="text-[10px] text-[var(--warning-3000)]">· not downloaded</span>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {asset.status === 'pending' ? (
                  <LemonButton size="small" type="secondary" disabled icon={<IconRefresh className="size-3.5 animate-spin" />} aria-label="Export pending" title="Export pending" />
                ) : asset.status === 'error' ? (
                  <LemonButton size="small" type="secondary" disabled icon={<IconWarning className="size-3.5 text-[var(--danger-3000)]" />} aria-label="Export failed" title="Export failed" />
                ) : (
                  <LemonButton
                    size="small"
                    type={!asset.downloaded ? 'primary' : 'secondary'}
                    icon={<IconDownload className="size-3.5" />}
                    onClick={() => onDownload?.(asset)}
                    aria-label="Download export"
                    title="Download export"
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </SidePanel>
  );
}
