import { Meta, StoryObj } from '@storybook/react'

import { IconFlag, IconInfo } from '@posthog/icons'

import { LemonTag as LemonTagComponent, LemonTagProps, LemonTagType } from './LemonTag'

const meta: Meta<LemonTagProps> = {
    title: 'Lemon UI/Lemon Tag',
    component: LemonTagComponent as any,
    tags: ['autodocs'],
}

export default meta
type Story = StoryObj<LemonTagProps>

const SIZES: ('small' | 'medium')[] = ['small', 'medium']

const ALL_COLORS: LemonTagType[] = [
    'primary',
    'option',
    'highlight',
    'warning',
    'danger',
    'success',
    'default',
    'muted',
    'completion',
    'caution',
    'none',
]

export const LemonTag: Story = {
    render: () => (
        <div className="space-y-2">
            {SIZES.map((size) => {
                return (
                    <div key={size}>
                        <h4 className="capitalize">{size}</h4>
                        <div className="flex gap-1 flex-wrap">
                            {ALL_COLORS.map((type) => (
                                <LemonTagComponent key={type} type={type} size={size}>
                                    {type}
                                </LemonTagComponent>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    ),
}

export const CloseOnClick: Story = {
    render: () => (
        <div className="space-y-4">
            <div>
                <h4>Close on Click Mode</h4>
                <p className="text-muted mb-2">
                    Hover to see the icon swap to close (X), click anywhere on the tag to close it
                </p>
                <div className="flex gap-2 flex-wrap">
                    <LemonTagComponent
                        icon={<IconFlag />}
                        closeOnClick
                        onClose={() => console.log('Tag closed!')}
                        type="primary"
                    >
                        Primary tag with icon
                    </LemonTagComponent>
                    <LemonTagComponent
                        icon={<IconInfo />}
                        closeOnClick
                        onClose={() => console.log('Info tag closed!')}
                        type="highlight"
                    >
                        Info tag
                    </LemonTagComponent>
                    <LemonTagComponent
                        icon={<IconFlag />}
                        closeOnClick
                        onClose={() => console.log('Warning tag closed!')}
                        type="warning"
                        size="small"
                    >
                        Small warning
                    </LemonTagComponent>
                </div>
            </div>
            <div>
                <h4>Regular Closable Tags (for comparison)</h4>
                <div className="flex gap-2 flex-wrap">
                    <LemonTagComponent
                        icon={<IconFlag />}
                        closable
                        onClose={() => console.log('Regular tag closed!')}
                        type="primary"
                    >
                        Regular closable
                    </LemonTagComponent>
                    <LemonTagComponent closable onClose={() => console.log('No icon tag closed!')} type="highlight">
                        No icon closable
                    </LemonTagComponent>
                </div>
            </div>
        </div>
    ),
}
