import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { RainbowText } from 'components/RainbowText'
import { BorderWrapper } from './components/BorderWrapper'
import { CallToAction } from './components/CallToAction'
import { Caption } from './components/Caption'
import { CalloutBox } from './components/Docs/CalloutBox'
import { Step, Steps } from './components/Docs/Steps'
import { Emoji } from './components/Emoji'
import Link from './components/Link'
import OSButton from './components/OSButton'
import { OSQuote } from './components/OSQuote'
import { OverflowXSection } from './components/OverflowXSection'
import { PrivateLink } from './components/PrivateLink'
import { StarRepoButton } from './components/StarRepoButton'

const named = (load: () => Promise<Record<string, unknown>>, exportName: string, ssr = true) =>
    dynamic(() => load().then((m) => ({ default: m[exportName] as ComponentType<any> })), {
        ssr,
        loading: () => null,
    })

const AboutPostHog = dynamic(() => import('./components/AboutPostHog'), { loading: () => null })
const CountriesWeHireIn = dynamic(() => import('./components/AMCharts/CountriesWeHireIn'), {
    ssr: false,
    loading: () => null,
})
const ArrayCTA = named(() => import('./components/ArrayCTA'), 'ArrayCTA')
const BasicHedgehogImage = named(() => import('./components/BasicHedgehogImage'), 'BasicHedgehogImage')
const BrandLogos = named(() => import('./components/BrandLogos'), 'BrandLogos')
const CompensationCalculator = named(() => import('./components/CompensationCalculator'), 'CompensationCalculator')
const DecisionTree = named(() => import('./components/Docs/DecisionTree'), 'DecisionTree')
const ProductChangelog = named(() => import('./components/Docs/ProductChangelog'), 'ProductChangelog')
const FormulaScreenshot = named(() => import('./components/FormulaScreenshot'), 'FormulaScreenshot')
const GDPRForm = named(() => import('./components/GDPRForm'), 'GDPRForm')
const HiddenSection = named(() => import('./components/HiddenSection'), 'HiddenSection')
const ImageSlider = dynamic(() => import('./components/ImageSlider'), { loading: () => null })
const SmallTeam = dynamic(() => import('./components/SmallTeam'), { loading: () => null })
const TaskOwnershipTable = dynamic(() => import('./components/TaskOwnershipTable'), { loading: () => null })
const TeamMember = dynamic(() => import('./components/TeamMember'), { loading: () => null })
const WistiaEmbed = dynamic(() => import('./components/WistiaEmbed'), { ssr: false, loading: () => null })
const PlatformInstall = dynamic(() => import('./components/PlatformInstall'), { loading: () => null })

export const shortcodes = {
    AboutPostHog,
    ArrayCTA,
    BasicHedgehogImage,
    BorderWrapper,
    BrandLogos,
    CallToAction,
    CalloutBox,
    Caption,
    CompensationCalculator,
    DecisionTree,
    Emoji,
    FormulaScreenshot,
    ImageSlider,
    GDPRForm,
    HiddenSection,
    OverflowXSection,
    OSQuote,
    OSButton,
    Link,
    PrivateLink,
    ProductChangelog,
    StarRepoButton,
    Steps,
    Step,
    SmallTeam,
    TeamMember,
    CountriesWeHireIn,
    TaskOwnershipTable,
    RainbowText,
    WistiaEmbed,
    PlatformInstall,
}
