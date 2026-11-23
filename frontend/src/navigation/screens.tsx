import { useNav, type ScreenRegistry } from './Navigator';
import PrototypeScreen from '../screens/PrototypeScreen';
import BrandScreen from '../screens/design/BrandScreen';
import ComponentsScreen from '../screens/design/ComponentsScreen';
import SubjectsScreen from '../screens/design/SubjectsScreen';
import SplashScreen from '../screens/onboarding/SplashScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import { ForgotPasswordScreen, LoginScreen, SignUpScreen } from '../screens/onboarding/AuthScreens';
import { OnboardExamScreen, OnboardMascotScreen, OnboardSubjectsScreen, OnboardTargetScreen } from '../screens/onboarding/OnboardingScreens';
import HomeScreen from '../screens/home/HomeScreen';
import PracticeHubScreen, { CbtIntroScreen } from '../screens/practice/PracticeHubScreen';
import CbtSessionScreen from '../screens/practice/CbtSessionScreen';
import CbtResultScreen from '../screens/practice/CbtResultScreen';
import WaecSessionScreen from '../screens/practice/WaecSessionScreen';
import PracticeStatesScreen from '../screens/practice/PracticeStatesScreen';
import StreakRepairScreen from '../screens/gamification/StreakRepairScreen';
import LevelUpScreen from '../screens/gamification/LevelUpScreen';
import { BadgesScreen, LevelsScreen, ProfileScreen } from '../screens/gamification/ProfileScreens';
import AiExplainScreen from '../screens/monetization/AiExplainScreen';
import PlansScreen from '../screens/monetization/PlansScreen';
import { CheckoutScreen, PaymentResultScreen } from '../screens/monetization/CheckoutScreens';
import { LeaderboardScreen } from '../screens/gamification/LeaderboardScreen';
import { SettingsScreen } from '../screens/gamification/SettingsScreen';
import { StreakCalendarScreen } from '../screens/gamification/StreakCalendarScreen';
import { DuelHubScreen, MatchmakingScreen } from '../screens/duels/DuelHubScreens';
import DuelBattleScreen from '../screens/duels/DuelBattleScreen';
import { DuelInviteReceivedScreen, DuelInviteScreen, DuelResultScreen, ShareCardScreen, WaInviteScreen } from '../screens/duels/SocialScreens';
import QuestionBankScreen from '../screens/QuestionBankScreen';
import { AmbassadorDashboardScreen, AmbassadorIntroScreen, AmbassadorPayoutScreen } from '../screens/ambassador/AmbassadorScreens';
import AmbassadorKitScreen from '../screens/ambassador/AmbassadorKitScreen';

function QuestionBankRoute() {
  const nav = useNav();
  return <QuestionBankScreen onBack={nav.back} />;
}

export const SCREENS: ScreenRegistry = {
  Prototype: PrototypeScreen,
  DesignBrand: BrandScreen,
  DesignComponents: ComponentsScreen,
  DesignSubjects: SubjectsScreen,
  Splash: SplashScreen,
  Welcome: WelcomeScreen,
  SignUp: SignUpScreen,
  Login: LoginScreen,
  ForgotPassword: ForgotPasswordScreen,
  OnboardExam: OnboardExamScreen,
  OnboardSubjects: OnboardSubjectsScreen,
  OnboardTarget: OnboardTargetScreen,
  OnboardMascot: OnboardMascotScreen,
  Home: HomeScreen,
  PracticeHub: PracticeHubScreen,
  DuelHub: DuelHubScreen,
  Leaderboard: LeaderboardScreen,
  Profile: ProfileScreen,
  Settings: SettingsScreen,
  StreakCalendar: StreakCalendarScreen,
  CbtIntro: CbtIntroScreen,
  CbtSession: CbtSessionScreen,
  CbtResult: CbtResultScreen,
  WaecSession: WaecSessionScreen,
  PracticeStates: PracticeStatesScreen,
  StreakRepair: StreakRepairScreen,
  LevelUp: LevelUpScreen,
  Badges: BadgesScreen,
  Levels: LevelsScreen,
  AiExplain: AiExplainScreen,
  Plans: PlansScreen,
  Checkout: CheckoutScreen,
  PaymentResult: PaymentResultScreen,
  Matchmaking: MatchmakingScreen,
  DuelBattle: DuelBattleScreen,
  DuelResult: DuelResultScreen,
  DuelInvite: DuelInviteScreen,
  DuelInviteReceived: DuelInviteReceivedScreen,
  ShareCard: ShareCardScreen,
  WaInvite: WaInviteScreen,
  AmbassadorIntro: AmbassadorIntroScreen,
  Ambassador: AmbassadorDashboardScreen,
  AmbassadorPayout: AmbassadorPayoutScreen,
  AmbassadorKit: AmbassadorKitScreen,
  QuestionBank: QuestionBankRoute,
};
