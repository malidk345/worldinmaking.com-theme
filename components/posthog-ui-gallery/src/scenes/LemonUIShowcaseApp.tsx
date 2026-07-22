import React, { useState } from 'react'
import {
  LemonButton,
  LemonButtonWithSideAction,
  LemonButtonWithDropdown,
  More,
  LemonInput,
  LemonSelect,
  MemberSelectDropdown,
  LemonCheckbox,
  LemonSwitch,
  LemonRadio,
  LemonSegmentedButton,
  LemonSlider,
  LemonTextArea,
  LemonFileInput,
  LemonLabel,
  LemonField,
  LemonSnack,
  LemonBadge,
  LemonTag,
  LemonBanner,
  LemonCard,
  LemonCollapsePanel,
  LemonCalendar,
  LemonColor,
  Splotch,
  LemonProgressCircle,
  LemonProgress,
  PaginationControl,
  LemonTreeItem,
  LemonDisabledArea,
  LemonSkeleton,
  Spinner,
  Lettermark,
  ProfilePicture,
  LemonTabs,
  LemonDivider,
  LemonModal,
  LemonDrawer,
  LemonRow,
  LemonMenu,
  LemonTable,
  Tooltip,
  LemonWidget,
  Link,
  LoadingBar,
  UploadedLogo,
  LemonInputSelect,
  LemonCalendarRange,
  IconCalculate,
  IconPlus,
  IconTrash,
  IconGear,
  IconSearch,
  IconInfo,
  IconNotebook,
  IconLink,
  IconChevronDown,
  IconChevronRight,
} from '../components/lemon-ui'

export function LemonUIShowcaseApp(): JSX.Element {
  const [activeTab, setActiveTab] = useState<'buttons' | 'inputs' | 'pickers' | 'overlays' | 'cards' | 'feedback' | 'tokens'>('buttons')

  // State bindings for interactive components
  const [inputText, setInputText] = useState('https://posthog.com/demo')
  const [selectVal, setSelectVal] = useState('weekly')
  const [memberVal, setMemberVal] = useState('all')
  const [checkVal, setCheckVal] = useState(true)
  const [switchVal, setSwitchVal] = useState(true)
  const [radioVal, setRadioVal] = useState('opt1')
  const [segmentedVal, setSegmentedVal] = useState('7d')
  const [sliderVal, setSliderVal] = useState(65)
  const [textAreaVal, setTextAreaVal] = useState('PostHog Lemon UI components extracted 1:1 without containers.')
  const [colorVal, setColorVal] = useState('#1e3a8a')
  const [pageVal, setPageVal] = useState(2)

  // Overlay states
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg-surface-primary)', color: 'var(--text-3000)', fontFamily: 'var(--font-sans)', padding: '2rem 3rem' }}>
      
      {/* Top Header */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-3000)', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '2rem' }}>🍋</span>
          <h1 style={{ margin: 0, fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Lemon UI Pure Component Showcase
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--color-text-secondary)', maxWidth: '720px' }}>
          All 38+ PostHog Lemon UI components rendered unboxed, without artificial containers or card borders. Direct 1:1 React implementations.
        </p>

        {/* Tab Selection Navigation */}
        <div style={{ marginTop: '1.5rem' }}>
          <LemonTabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as any)}
            tabs={[
              { key: 'buttons', label: '1. Buttons & Triggers', badge: <LemonBadge content="21" status="primary" /> },
              { key: 'inputs', label: '2. Form Controls & Inputs' },
              { key: 'pickers', label: '3. Pickers & Data Visuals' },
              { key: 'overlays', label: '4. Overlays & Menus (Modal/Drawer)' },
              { key: 'cards', label: '5. Content & Hierarchy (Rows/Tree)' },
              { key: 'feedback', label: '6. Feedback & Avatars' },
              { key: 'tokens', label: '7. Typography & Design Tokens' },
            ]}
          />
        </div>
      </div>

      {/* Main Open Unboxed Content */}

      {/* ─── TAB 1: BUTTONS ─────────────────────────────────────────────────── */}
      {activeTab === 'buttons' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Types & Statuses Matrix</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Primary, Secondary, Tertiary buttons across Default, Alt, and Danger statuses.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <LemonButton type="primary" status="default">Primary Default</LemonButton>
              <LemonButton type="primary" status="alt">Primary Alt</LemonButton>
              <LemonButton type="primary" status="danger">Primary Danger</LemonButton>
              
              <LemonButton type="secondary" status="default">Secondary Default</LemonButton>
              <LemonButton type="secondary" status="alt">Secondary Alt</LemonButton>
              <LemonButton type="secondary" status="danger">Secondary Danger</LemonButton>

              <LemonButton type="tertiary" status="default">Tertiary Default</LemonButton>
              <LemonButton type="tertiary" status="alt">Tertiary Alt</LemonButton>
              <LemonButton type="tertiary" status="danger">Tertiary Danger</LemonButton>
            </div>
          </div>

          <LemonDivider />

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sizes & Icon Combinations</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <LemonButton size="small" type="secondary" icon={<IconPlus />}>Small Button</LemonButton>
              <LemonButton size="medium" type="secondary" icon={<IconGear />}>Medium Button</LemonButton>
              <LemonButton size="large" type="secondary" icon={<IconNotebook />}>Large Button</LemonButton>

              <LemonButton size="small" type="tertiary" icon={<IconTrash />} />
              <LemonButton size="medium" type="tertiary" icon={<IconSearch />} />
              <LemonButton size="large" type="tertiary" icon={<IconCalculate />} />
            </div>
          </div>

          <LemonDivider />

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Dropdown & Side Action Triggers</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
              <LemonButtonWithDropdown
                type="secondary"
                dropdown={{
                  overlay: (
                    <div style={{ width: '180px' }}>
                      <LemonButton fullWidth icon={<IconInfo />}>View Details</LemonButton>
                      <LemonButton fullWidth icon={<IconGear />}>Edit Settings</LemonButton>
                      <LemonDivider />
                      <LemonButton fullWidth status="danger" icon={<IconTrash />}>Delete</LemonButton>
                    </div>
                  ),
                }}
              >
                Dropdown Menu
              </LemonButtonWithDropdown>

              <LemonButtonWithSideAction
                type="secondary"
                sideAction={{
                  icon: <IconChevronDown />,
                  dropdown: {
                    overlay: (
                      <div style={{ width: '180px' }}>
                        <LemonButton fullWidth>Option A</LemonButton>
                        <LemonButton fullWidth>Option B</LemonButton>
                      </div>
                    ),
                  },
                }}
              >
                Split Side Action
              </LemonButtonWithSideAction>

              <More
                overlay={
                  <div style={{ width: '160px' }}>
                    <LemonButton fullWidth>Copy Link</LemonButton>
                    <LemonButton fullWidth>Duplicate</LemonButton>
                    <LemonButton fullWidth status="danger">Archive</LemonButton>
                  </div>
                }
              />

              <LemonButton type="primary" loading>Loading Button</LemonButton>
              <LemonButton type="secondary" disabled disabledReason="Requires Admin privilege">Disabled</LemonButton>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: INPUTS ──────────────────────────────────────────────────── */}
      {activeTab === 'inputs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '640px' }}>
          <LemonField label="Text Input (Clearable & Prefix)" help="Click the clear button to reset input.">
            <LemonInput
              fullWidth
              value={inputText}
              onChange={setInputText}
              prefix={<IconLink />}
              allowClear
              placeholder="Enter URL..."
            />
          </LemonField>

          <LemonField label="Select Options">
            <LemonSelect
              value={selectVal}
              onChange={setSelectVal}
              options={[
                { value: 'daily', label: 'Daily Breakdown' },
                { value: 'weekly', label: 'Weekly Breakdown' },
                { value: 'monthly', label: 'Monthly Breakdown' },
              ]}
            />
          </LemonField>

          <LemonField label="Member Select Dropdown">
            <MemberSelectDropdown
              value={memberVal}
              onChange={setMemberVal}
              options={[
                { value: 'all', label: 'All Members' },
                { value: 'paul', label: 'Paul D. (Admin)' },
                { value: 'lisa', label: 'Lisa K. (Member)' },
              ]}
            />
          </LemonField>

          <LemonField label="Checkbox & Toggle Switch">
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <LemonCheckbox checked={checkVal} onChange={setCheckVal} label="Enable Auto-Save" />
              <LemonSwitch checked={switchVal} onChange={setSwitchVal} label="Live Production Sync" />
            </div>
          </LemonField>

          <LemonField label="Radio Options Group">
            <LemonRadio
              value={radioVal}
              onChange={setRadioVal}
              options={[
                { value: 'opt1', label: 'Option 1: Direct SQL Query' },
                { value: 'opt2', label: 'Option 2: HogQL Query Runner' },
              ]}
            />
          </LemonField>

          <LemonField label="Segmented Button Control">
            <LemonSegmentedButton
              value={segmentedVal}
              onChange={setSegmentedVal}
              options={[
                { value: '24h', label: 'Last 24 Hours' },
                { value: '7d', label: 'Last 7 Days' },
                { value: '30d', label: 'Last 30 Days' },
              ]}
            />
          </LemonField>

          <LemonField label="Multi-Line Text Area">
            <LemonTextArea value={textAreaVal} onChange={setTextAreaVal} rows={3} />
          </LemonField>

          <LemonField label="File Upload Dropzone">
            <LemonFileInput />
          </LemonField>
        </div>
      )}

      {/* ─── TAB 3: PICKERS ─────────────────────────────────────────────────── */}
      {activeTab === 'pickers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Calendar Month Picker</h3>
            <LemonCalendar />
          </div>

          <LemonDivider />

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Color Swatch & Splotch</h3>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <LemonColor color={colorVal} onChange={setColorVal} />
              <Splotch color="#16a34a" />
              <Splotch color="#dc2626" />
              <Splotch color="#d97706" />
            </div>
          </div>

          <LemonDivider />

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Progress Indicators & Range Slider</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '480px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <LemonProgressCircle progress={0.75} size={42} />
                <div style={{ flex: 1 }}>
                  <LemonProgress percent={sliderVal} status="default" />
                </div>
              </div>
              <LemonSlider value={sliderVal} onChange={setSliderVal} min={0} max={100} />
            </div>
          </div>

          <LemonDivider />

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Pagination Control</h3>
            <PaginationControl page={pageVal} totalPages={8} onChange={setPageVal} />
          </div>
        </div>
      )}

      {/* ─── TAB 4: OVERLAYS ────────────────────────────────────────────────── */}
      {activeTab === 'overlays' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Modal & Drawer Dialog Triggers</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>Click below to trigger open fullscreen overlays.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <LemonButton type="primary" onClick={() => setModalOpen(true)}>Open Lemon Modal</LemonButton>
              <LemonButton type="secondary" onClick={() => setDrawerOpen(true)}>Open Side Drawer</LemonButton>
            </div>
          </div>

          <LemonDivider />

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Standalone LemonMenu</h3>
            <LemonMenu
              items={[
                { label: 'View Profile', icon: <IconInfo /> },
                { label: 'Account Settings', icon: <IconGear /> },
                { label: 'Delete Workspace', icon: <IconTrash />, status: 'danger' },
              ]}
            />
          </div>

          {/* Interactive Modal */}
          <LemonModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Create New Feature Flag"
            footer={
              <>
                <LemonButton type="tertiary" onClick={() => setModalOpen(false)}>Cancel</LemonButton>
                <LemonButton type="primary" onClick={() => setModalOpen(false)}>Save Flag</LemonButton>
              </>
            }
          >
            <LemonField label="Flag Key">
              <LemonInput placeholder="beta-feature-enabled" fullWidth />
            </LemonField>
          </LemonModal>

          {/* Interactive Drawer */}
          <LemonDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Insight Configuration"
          >
            <LemonField label="Series Event">
              <LemonInput defaultValue="$pageview" fullWidth />
            </LemonField>
            <LemonField label="Breakdown">
              <LemonSelect
                value="browser"
                options={[
                  { value: 'browser', label: 'Browser Name' },
                  { value: 'country', label: 'Country Code' },
                ]}
              />
            </LemonField>
          </LemonDrawer>
        </div>
      )}

      {/* ─── TAB 5: CARDS & HIERARCHY ────────────────────────────────────────── */}
      {activeTab === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>LemonTable Component</h3>
            <LemonTable
              columns={[
                { title: 'User / Distinct ID', dataIndex: 'user', render: (val) => <ProfilePicture name={val} showName /> },
                { title: 'Role', dataIndex: 'role', render: (val) => <LemonTag type="highlight">{val}</LemonTag> },
                { title: 'Status', dataIndex: 'status', render: (val) => <LemonBadge content={val} status="success" /> },
                { title: 'Actions', key: 'actions', render: () => <More overlay={<LemonButton fullWidth>View Profile</LemonButton>} /> },
              ]}
              dataSource={[
                { user: 'Paul D.', role: 'Admin', status: 'Active' },
                { user: 'Lisa K.', role: 'Engineer', status: 'Active' },
                { user: 'Mark T.', role: 'Analyst', status: 'Active' },
              ]}
            />
          </div>

          <LemonDivider />

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>LemonRow Structured Items</h3>
            <div style={{ maxWidth: '640px' }}>
              <LemonRow
                icon={<IconNotebook />}
                title="Product Analytics Overview"
                description="Updated 2 hours ago by Paul D."
                sideAction={<LemonButton size="small" type="tertiary">Edit</LemonButton>}
              />
              <LemonRow
                icon={<IconGear />}
                title="API Authentication Keys"
                description="Project Secret API Key active"
                sideAction={<LemonTag type="completion">Active</LemonTag>}
              />
            </div>
          </div>

          <LemonDivider />

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>File Tree Item Hierarchy</h3>
            <LemonTreeItem label="products/" defaultOpen>
              <LemonTreeItem label="insights/" defaultOpen>
                <LemonTreeItem label="TrendInsight.tsx" />
                <LemonTreeItem label="FunnelInsight.tsx" />
              </LemonTreeItem>
              <LemonTreeItem label="cohorts/">
                <LemonTreeItem label="CohortList.tsx" />
              </LemonTreeItem>
            </LemonTreeItem>
          </div>

          <LemonDivider />

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Accordion Panels</h3>
            <div style={{ maxWidth: '600px' }}>
              <LemonCollapsePanel header="How does tenant isolation work?" defaultExpanded>
                Every tenant-data model has a team_id field and queries run fail-closed.
              </LemonCollapsePanel>
              <LemonCollapsePanel header="Where are generated API types saved?">
                drf-spectacular + Orval generates TypeScript types into generated folders.
              </LemonCollapsePanel>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 6: FEEDBACK & AVATARS ─────────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '640px' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Banners & Notifications</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <LemonBanner type="info">New feature flag system is now active in your workspace.</LemonBanner>
              <LemonBanner type="success">Successfully exported insight data to CSV format.</LemonBanner>
              <LemonBanner type="warning">Your ClickHouse query quota is at 85% utilization.</LemonBanner>
              <LemonBanner type="error">Failed to connect to SeaweedFS object storage endpoint.</LemonBanner>
            </div>
          </div>

          <LemonDivider />

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Badges & Tags</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
              <LemonBadge content="12" status="danger" />
              <LemonBadge content="Active" status="success" />
              <LemonBadge content="Beta" status="warning" />

              <LemonTag type="highlight">Highlight</LemonTag>
              <LemonTag type="completion">Completion</LemonTag>
              <LemonTag type="warning">Warning</LemonTag>
              <LemonTag type="danger">Danger</LemonTag>
              <LemonTag type="muted">Muted</LemonTag>
            </div>
          </div>

          <LemonDivider />

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Snack Chips & User Avatars</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <LemonSnack onClose={() => {}}>React 19</LemonSnack>
              <LemonSnack onClose={() => {}}>TypeScript 5.8</LemonSnack>

              <Lettermark name="Antigravity" index={1} />
              <Lettermark name="PostHog" index={2} />

              <ProfilePicture name="Paul" showName />
              <ProfilePicture name="Lisa" size="lg" showName />
            </div>
          </div>

          <LemonDivider />

          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Loading Skeleton placeholders</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <LemonSkeleton width="60%" height="1.5rem" />
              <LemonSkeleton width="100%" height="1rem" />
              <LemonSkeleton width="85%" height="1rem" />
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 7: TYPOGRAPHY & DESIGN TOKENS ───────────────────────────────── */}
      {activeTab === 'tokens' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Typography Scale */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>PostHog Typography Hierarchy</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Display / Hero Title (40px / 2.5rem • ExtraBold 800)</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em' }}>Product Analytics Built for Engineers</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>H1 Scene Title (30px / 1.875rem • ExtraBold 800)</div>
                <div style={{ fontSize: '1.875rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' }}>Notebooks & SQL Insights Overview</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>H2 Section Title (24px / 1.5rem • SemiBold 700)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.3 }}>Configure Experiment Variant Rules</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>H3 Card Header (18px / 1.125rem • SemiBold 700)</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.4 }}>Session Replay Recording Filter</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Body Base / Default (14px / 0.875rem • Regular 400 & Medium 500)</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 }}>
                  PostHog captures events, session recordings, and feature flags in real-time. Team isolation is enforced at the database layer using team_id scoped query filters.
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Code / Monospace (13px / 0.8125rem • Font Mono)</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', backgroundColor: 'var(--color-bg-surface-secondary)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', color: 'var(--primary-3000)' }}>
                  SELECT event, count() FROM events WHERE team_id = 2 GROUP BY event ORDER BY count() DESC
                </div>
              </div>
            </div>
          </div>

          <LemonDivider />

          {/* Border Radius Tokens */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Border Radius Tokens</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
              <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--color-bg-surface-secondary)', border: '1px solid var(--border-3000)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}>
                <code>--radius-sm</code> (0.25rem / 4px)
              </div>
              <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--color-bg-surface-secondary)', border: '1px solid var(--border-3000)', borderRadius: 'var(--radius)', fontSize: '0.8125rem' }}>
                <code>--radius</code> (0.375rem / 6px)
              </div>
              <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--color-bg-surface-secondary)', border: '1px solid var(--border-3000)', borderRadius: 'var(--radius-lg)', fontSize: '0.8125rem' }}>
                <code>--radius-lg</code> (0.625rem / 10px)
              </div>
              <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--primary-3000)', color: '#fff', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem' }}>
                <code>--radius-full</code> (9999px)
              </div>
            </div>
          </div>

          <LemonDivider />

          {/* Spacing & Breakpoints */}
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Responsive Breakpoint Tokens</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-surface-secondary)', border: '1px solid var(--border-3000)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>--breakpoint-sm</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>576px (Mobile Landscape)</div>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-surface-secondary)', border: '1px solid var(--border-3000)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>--breakpoint-md</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>768px (Tablet Portrait)</div>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-surface-secondary)', border: '1px solid var(--border-3000)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>--breakpoint-lg</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>992px (Desktop/Laptop)</div>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg-surface-secondary)', border: '1px solid var(--border-3000)', borderRadius: 'var(--radius)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>--breakpoint-xl</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>1200px (Wide Display)</div>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
