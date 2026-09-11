import dynamic from 'next/dynamic'
import { BorderWrapper } from './components/BorderWrapper'
import { CallToAction } from './components/CallToAction'
import { Caption } from './components/Caption'
import { CalloutBox } from './components/Docs/CalloutBox'
import { Step, Steps } from './components/Docs/Steps'
import { Emoji } from './components/Emoji'
import KeyboardShortcut from './components/KeyboardShortcut'
import Link from './components/Link'
import { List } from './components/List'
import OSButton from './components/OSButton'
import { OSQuote } from './components/OSQuote'
import { OverflowXSection } from './components/OverflowXSection'
import { PrivateLink } from './components/PrivateLink'
import { RainbowText } from './components/RainbowText'
import { StarRepoButton } from './components/StarRepoButton'
import { AdvisoryAnchor } from './components/Heading'
import CloudinaryImage from './components/CloudinaryImage'
import Label from './components/Label'

const named = (load, exportName, ssr = true) =>
    dynamic(() => load().then((m) => ({ default: m[exportName] })), { ssr, loading: () => null })

const AboutPostHog = dynamic(() => import('./components/AboutPostHog'), { loading: () => null })
const CountriesWeHireIn = dynamic(() => import('./components/AMCharts/CountriesWeHireIn'), {
    ssr: false,
    loading: () => null,
})
const ArrayCTA = named(() => import('./components/ArrayCTA'), 'ArrayCTA')
const AskAIInput = dynamic(() => import('./components/AskAIInput'), { loading: () => null })
const BasicHedgehogImage = named(() => import('./components/BasicHedgehogImage'), 'BasicHedgehogImage')
const BrandLogos = named(() => import('./components/BrandLogos'), 'BrandLogos')
const HearAboutUsCarousel = named(() => import('./components/CardStackCarousel/HearAboutUsCarousel'), 'HearAboutUsCarousel')
const CompensationCalculator = named(() => import('./components/CompensationCalculator'), 'CompensationCalculator')
const ContentViewer = dynamic(() => import('./components/ContentViewer'), { loading: () => null })
const EmbeddedSurvey = dynamic(() => import('./components/Docs/EmbeddedSurvey'), { loading: () => null })
const Drawer = named(() => import('./components/Drawer'), 'Drawer')
const FormulaScreenshot = named(() => import('./components/FormulaScreenshot'), 'FormulaScreenshot')
const GDPRForm = named(() => import('./components/GDPRForm'), 'GDPRForm')
const HiddenSection = dynamic(() => import('./components/HiddenSection').then((m) => ({ default: m.HiddenSection })), {
    loading: () => null,
})
const ImageSlider = dynamic(() => import('./components/ImageSlider'), { loading: () => null })
const LPCTA = named(() => import('./components/LPCTA'), 'LPCTA')
const MaxCTA = named(() => import('./components/MaxCTA'), 'MaxCTA')
const QuickLinks = dynamic(() => import('./components/QuickLinks'), { loading: () => null })
const Quote2 = named(() => import('./components/Quote2'), 'Quote2')
const SmallTeam = dynamic(() => import('./components/SmallTeam'), { loading: () => null })
const TaskOwnershipTable = dynamic(() => import('./components/TaskOwnershipTable'), { loading: () => null })
const TeamMember = dynamic(() => import('./components/TeamMember'), { loading: () => null })
const TracksCTA = named(() => import('./components/TracksCTA'), 'TracksCTA')
const Tweet = named(() => import('./components/Tweet'), 'Tweet')
const SolvedQuestions = dynamic(() => import('./components/Docs/SolvedQuestions'), { loading: () => null })
const WistiaEmbed = dynamic(() => import('./components/WistiaEmbed'), { ssr: false, loading: () => null })

const Images = () => null
const Snippet = () => null
const lib = () => null
const Competitor = () => null
const DocsLinks = () => null
const Squeak = () => null
const Signatures = () => null
const ComparisonTable = () => null
const ProductComparisonTable = () => null
const ProductList = () => null
const ProductScreenshot = () => null
const ProductVideo = () => null
const FeatureAvailability = () => null
const FeatureOwnershipTable = () => null
const SlackPage = () => null
const WizardCommand = () => null
const WizardCTA = () => null
const Quote = () => null
const FAQ = () => null
const Feature = () => null
const Marquee = () => null
const MobileSlides = () => null
const PairsWith = () => null
const Question = () => null
const SmoothScroll = () => null
const Subfeature = () => null
const TextCard = () => null
const TutorialCard = () => null

export const shortcodes = {
    AboutPostHog,
    ArrayCTA,
    BasicHedgehogImage,
    BorderWrapper,
    BrandLogos,
    CallToAction,
    CalloutBox,
    Caption,
    HearAboutUsCarousel,
    CloudinaryImage,
    Images,
    ImageSlider,
    ComparisonTable,
    ProductComparisonTable,
    ProductList,
    Snippet,
    CompensationCalculator,
    ContentViewer,
    Drawer,
    lib,
    Emoji,
    FeatureAvailability,
    FormulaScreenshot,
    GDPRForm,
    AdvisoryAnchor,
    HiddenSection,
    KeyboardShortcut,
    LPCTA,
    Label,
    List,
    OverflowXSection,
    Quote,
    OSQuote,
    OSButton,
    Link,
    PrivateLink,
    ProductScreenshot,
    ProductVideo,
    Competitor,
    DocsLinks,
    FAQ,
    Feature,
    Marquee,
    MobileSlides,
    PairsWith,
    Question,
    SmoothScroll,
    Subfeature,
    TextCard,
    TutorialCard,
    QuickLinks,
    Quote2,
    Signatures,
    SlackPage,
    Squeak,
    StarRepoButton,
    TracksCTA,
    Tweet,
    MaxCTA,
    SmallTeam,
    TeamMember,
    Steps,
    Step,
    AskAIInput,
    CountriesWeHireIn,
    FeatureOwnershipTable,
    TaskOwnershipTable,
    RainbowText,
    SolvedQuestions,
    WistiaEmbed,
    WizardCommand,
    WizardCTA,
    EmbeddedSurvey,
}
