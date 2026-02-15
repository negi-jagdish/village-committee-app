import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { RootState } from '../store';

// Screens
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DrivesScreen from '../screens/DrivesScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import NewsScreen from '../screens/NewsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CashbookScreen from '../screens/CashbookScreen';
import ApprovalsScreen from '../screens/ApprovalsScreen';
import AddIncomeScreen from '../screens/AddIncomeScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import TransactionDetailsScreen from '../screens/TransactionDetailsScreen';
import CreateDriveScreen from '../screens/CreateDriveScreen';
import DriveDetailsScreen from '../screens/DriveDetailsScreen';
import PostNewsScreen from '../screens/PostNewsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import MembersScreen from '../screens/MembersScreen';
import AddMemberScreen from '../screens/AddMemberScreen';
import MemberDetailsScreen from '../screens/MemberDetailsScreen';
import ReportsScreen from '../screens/ReportsScreen';
import PendingDuesReportScreen from '../screens/PendingDuesReportScreen';
import PaymentsReportScreen from '../screens/PaymentsReportScreen';
import CreatePollScreen from '../screens/CreatePollScreen';
import PollDetailsScreen from '../screens/PollDetailsScreen';
import PollHistoryScreen from '../screens/PollHistoryScreen';
import EditPollScreen from '../screens/EditPollScreen';
import PollVotesScreen from '../screens/PollVotesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Icon Component
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
    const icons: Record<string, string> = {
        Home: '🏠',
        Drives: '💰',
        Transactions: '📊',
        News: '📰',
        Profile: '👤',
        Gallery: '🖼️',
    };
    return (
        <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20 }}>{icons[name]}</Text>
        </View>
    );
};

// Home Stack (Dashboard + Cashbook + Approvals)
function HomeStack() {
    const { t } = useTranslation();

    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#1a5f2a' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <Stack.Screen
                name="Dashboard"
                component={DashboardScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Cashbook"
                component={CashbookScreen}
                options={{ title: t('dashboard.viewCashbook') }}
            />
            <Stack.Screen
                name="Approvals"
                component={ApprovalsScreen}
                options={{ title: 'Pending Approvals' }}
            />
            <Stack.Screen
                name="Reports"
                component={ReportsScreen}
                options={{ title: 'Reports' }}
            />
            <Stack.Screen
                name="PendingDuesReport"
                component={PendingDuesReportScreen}
                options={{ title: 'Pending Dues Report' }}
            />
            <Stack.Screen
                name="PaymentsReport"
                component={PaymentsReportScreen}
                options={{ title: 'Payments Received Report' }}
            />
            <Stack.Screen
                name="CreatePoll"
                component={CreatePollScreen}
                options={{ title: 'Create Poll' }}
            />
            <Stack.Screen
                name="PollDetails"
                component={PollDetailsScreen}
                options={{ title: 'Poll Details' }}
            />
            <Stack.Screen
                name="PollHistory"
                component={PollHistoryScreen}
                options={{ title: 'Poll History' }}
            />
            <Stack.Screen
                name="EditPoll"
                component={EditPollScreen}
                options={{ title: 'Edit Poll' }}
            />
            <Stack.Screen
                name="PollVotes"
                component={PollVotesScreen}
                options={{ title: 'Poll Votes' }}
            />
        </Stack.Navigator>
    );
}

import AddOpeningBalanceScreen from '../screens/AddOpeningBalanceScreen';

// Transactions Stack (Transactions + AddIncome + AddExpense + Details + OpeningBalance)
function TransactionsStack() {
    const { t } = useTranslation();

    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#1a5f2a' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <Stack.Screen
                name="TransactionsList"
                component={TransactionsScreen}
                options={{ title: t('tabs.transactions') }}
            />
            <Stack.Screen
                name="AddIncome"
                component={AddIncomeScreen}
                options={{ title: 'Record Income' }}
            />
            <Stack.Screen
                name="AddExpense"
                component={AddExpenseScreen}
                options={{ title: 'Record Expense' }}
            />
            <Stack.Screen
                name="TransactionDetails"
                component={TransactionDetailsScreen}
                options={{ title: 'Transaction Details' }}
            />
            <Stack.Screen
                name="AddOpeningBalance"
                component={AddOpeningBalanceScreen}
                options={{ title: 'Set Opening Balance' }}
            />
        </Stack.Navigator>
    );
}

// Drives Stack (Drives + CreateDrive)
function DrivesStack() {
    const { t } = useTranslation();

    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#1a5f2a' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <Stack.Screen
                name="DrivesList"
                component={DrivesScreen}
                options={{ title: t('tabs.drives') }}
            />
            <Stack.Screen
                name="CreateDrive"
                component={CreateDriveScreen}
                options={{ title: 'Create Contribution Drive' }}
            />
            <Stack.Screen
                name="DriveDetails"
                component={DriveDetailsScreen}
                options={{ title: 'Drive Details' }}
            />
        </Stack.Navigator>
    );
}

// News Stack (News + PostNews)
function NewsStack() {
    const { t } = useTranslation();

    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#1a5f2a' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <Stack.Screen
                name="NewsFeed"
                component={NewsScreen}
                options={{ title: t('tabs.news') }}
            />
            <Stack.Screen
                name="PostNews"
                component={PostNewsScreen}
                options={{ title: 'Post News' }}
            />
            <Stack.Screen
                name="CreatePoll"
                component={CreatePollScreen}
                options={{ title: 'Create Poll' }}
            />
            <Stack.Screen
                name="PollDetails"
                component={PollDetailsScreen}
                options={{ title: 'Poll Details' }}
            />
            <Stack.Screen
                name="PollHistory"
                component={PollHistoryScreen}
                options={{ title: 'Poll History' }}
            />
            <Stack.Screen
                name="EditPoll"
                component={EditPollScreen}
                options={{ title: 'Edit Poll' }}
            />
            <Stack.Screen
                name="PollVotes"
                component={PollVotesScreen}
                options={{ title: 'Poll Votes' }}
            />
        </Stack.Navigator>
    );
}

// Profile Stack (Profile + ChangePassword)
function ProfileStack() {
    const { t } = useTranslation();

    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#1a5f2a' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <Stack.Screen
                name="ProfileView"
                component={ProfileScreen}
                options={{ title: t('tabs.profile') }}
            />
            <Stack.Screen
                name="ChangePassword"
                component={ChangePasswordScreen}
                options={{ title: 'Change Password' }}
            />
            <Stack.Screen
                name="MembersList"
                component={MembersScreen}
                options={{ title: t('members.title') }}
            />
            <Stack.Screen
                name="AddMember"
                component={AddMemberScreen}
                options={{ title: t('members.addMember') }}
            />
            <Stack.Screen
                name="MemberDetails"
                component={MemberDetailsScreen}
                options={{ title: 'Member Details' }}
            />
        </Stack.Navigator>
    );
}

// Gallery Stack (Gallery + AddEvent + Details + AddMedia)
import GalleryScreen from '../screens/GalleryScreen';
import EventDetailsScreen from '../screens/EventDetailsScreen';
import AddEventScreen from '../screens/AddEventScreen';
import AddMediaScreen from '../screens/AddMediaScreen';

function GalleryStack() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: { backgroundColor: '#1a5f2a' },
                headerTintColor: '#fff',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <Stack.Screen
                name="GalleryList"
                component={GalleryScreen}
                options={{ title: 'Gallery' }}
            />
            <Stack.Screen
                name="EventDetails"
                component={EventDetailsScreen}
                options={{ title: 'Event Details' }}
            />
            <Stack.Screen
                name="AddEvent"
                component={AddEventScreen}
                options={{ title: 'Create Event' }}
            />
            <Stack.Screen
                name="AddMedia"
                component={AddMediaScreen}
                options={{ title: 'Add Media' }}
            />
        </Stack.Navigator>
    );
}

// Main Tab Navigator
function MainTabs() {
    const { t } = useTranslation();
    const user = useSelector((state: RootState) => state.auth.user);
    const hasAdminAccess = user?.role === 'president' || user?.role === 'cashier';

    return (
        <Tab.Navigator
            initialRouteName="News"
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
                tabBarActiveTintColor: '#1a5f2a',
                tabBarInactiveTintColor: '#999',
                tabBarStyle: {
                    paddingBottom: 5,
                    paddingTop: 5,
                    height: 60,
                },
                headerStyle: {
                    backgroundColor: '#1a5f2a',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeStack}
                options={{ title: t('tabs.home'), headerShown: false }}
            />

            {hasAdminAccess && (
                <>
                    <Tab.Screen
                        name="Drives"
                        component={DrivesStack}
                        options={{ title: t('tabs.drives'), headerShown: false }}
                    />
                    <Tab.Screen
                        name="Transactions"
                        component={TransactionsStack}
                        options={{ title: t('tabs.transactions'), headerShown: false }}
                    />
                </>
            )}

            <Tab.Screen
                name="Gallery"
                component={GalleryStack}
                options={{ title: 'Gallery', headerShown: false }}
            />
            <Tab.Screen
                name="News"
                component={NewsStack}
                options={{ title: t('tabs.news'), headerShown: false }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileStack}
                options={{ title: t('tabs.profile'), headerShown: false }}
            />
        </Tab.Navigator>
    );
}

// Root Navigator
export default function AppNavigator() {
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!isAuthenticated ? (
                <Stack.Screen name="Login" component={LoginScreen} />
            ) : (
                <Stack.Screen name="Main" component={MainTabs} />
            )}
        </Stack.Navigator>
    );
}
