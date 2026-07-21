import React, { useState } from 'react';
import { SidePanel } from '../../LemonUI/LemonDrawer/LemonDrawer';
import { LemonButton } from '../../LemonUI/LemonButton/LemonButton';
import { LemonTag } from '../../LemonUI/LemonTag/LemonTag';
import { LemonBanner } from '../../LemonUI/LemonBanner/LemonBanner';
import { IconLock, IconPerson, IconTrash } from '@posthog/icons';

export type AccessLevel = 'viewer' | 'editor' | 'admin' | 'no_access';

export interface AccessControlMember {
  id: string;
  name: string;
  email: string;
  avatarInitial?: string;
  accessLevel: AccessLevel;
}

export interface SidePanelAccessControlProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType?: string;
  members?: AccessControlMember[];
  onChangeAccess?: (memberId: string, level: AccessLevel) => void;
  onRemoveMember?: (memberId: string) => void;
}

const ACCESS_LEVELS: { value: AccessLevel; label: string; color: 'success' | 'warning' | 'primary' | 'muted' | 'danger' }[] = [
  { value: 'admin', label: 'Admin', color: 'danger' },
  { value: 'editor', label: 'Editor', color: 'primary' },
  { value: 'viewer', label: 'Viewer', color: 'success' },
  { value: 'no_access', label: 'No access', color: 'muted' },
];

export function SidePanelAccessControl({
  isOpen,
  onClose,
  resourceType = 'resource',
  members = [],
  onChangeAccess,
  onRemoveMember,
}: SidePanelAccessControlProps) {
  const sampleMembers: AccessControlMember[] =
    members.length > 0
      ? members
      : [
          { id: '1', name: 'James Hawkins', email: 'james@posthog.com', avatarInitial: 'JH', accessLevel: 'admin' },
          { id: '2', name: 'Marius Andra', email: 'marius@posthog.com', avatarInitial: 'MA', accessLevel: 'editor' },
          { id: '3', name: 'Tim Glaser', email: 'tim@posthog.com', avatarInitial: 'TG', accessLevel: 'viewer' },
        ];

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          <IconLock className="size-4 text-[var(--primary-3000)]" />
          Access control
        </span>
      }
      description={`Manage who can access this ${resourceType}`}
      width="26rem"
    >
      <div className="flex flex-col gap-4 py-2">
        <LemonBanner type="info">
          <span className="text-xs">
            Object permissions assign access for individuals and roles to this {resourceType}.
          </span>
        </LemonBanner>

        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-3000)]">Members</p>

          {sampleMembers.map((member) => {
            const levelMeta = ACCESS_LEVELS.find((l) => l.value === member.accessLevel);
            return (
              <div
                key={member.id}
                className="flex items-center gap-2.5 p-2.5 rounded border border-[var(--border-3000)] bg-[var(--color-bg-surface-primary)]"
              >
                <div className="size-7 rounded-full bg-[var(--primary-3000)] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {member.avatarInitial ?? member.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-3000)] truncate">{member.name}</p>
                  <p className="text-[10px] text-[var(--muted-3000)] truncate">{member.email}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <LemonTag type={levelMeta?.color ?? 'muted'} size="small">
                    {levelMeta?.label ?? member.accessLevel}
                  </LemonTag>
                  <LemonButton
                    size="small"
                    type="tertiary"
                    icon={<IconTrash className="size-3.5 text-[var(--danger-3000)]" />}
                    onClick={() => onRemoveMember?.(member.id)}
                  />
                </div>
              </div>
            );
          })}

          <LemonButton
            icon={<IconPerson className="size-3.5" />}
            type="secondary"
            size="small"
          >
            Add member
          </LemonButton>
        </div>
      </div>
    </SidePanel>
  );
}
