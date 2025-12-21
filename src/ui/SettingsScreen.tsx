
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { resetDatabase, get30DayHistory } from '../data/database';
import { OperatorDailyStats } from '../data/schema';
import { DataViewerModal } from './DataViewerModal';
import { DevConsoleScreen } from './DevConsoleScreen';

interface SettingsScreenProps {
    onOpenDevConsole: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onOpenDevConsole }) => {
    const [showDataModal, setShowDataModal] = React.useState(false);
    const [historicalData, setHistoricalData] = React.useState<OperatorDailyStats[]>([]);

    const handleViewData = async () => {
        try {
            const history = await get30DayHistory();
            const sorted = history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setHistoricalData(sorted);
            setShowDataModal(true);
        } catch (error) {
            Alert.alert('Error', 'Could not load data.');
        }
    };

    const handleExport = async () => {
        try {
            const history = await get30DayHistory();
            const exportData = JSON.stringify(history, null, 2);
            await Share.share({
                message: exportData,
                title: 'Sentient 30-Day Export'
            });
        } catch (error) {
            Alert.alert('Export Failed', 'Could not export data.');
        }
    };

    const handleReset = () => {
        Alert.alert(
            'Reset to Day Zero',
            'Are you sure? This will delete ALL data and reset the First Launch flag.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset Everything',
                    style: 'destructive',
                    onPress: async () => {
                        await resetDatabase();
                        Alert.alert('System Reset', 'Please restart the app to initiate Day Zero Protocol.');
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.settingsContainer}>
                <Text style={styles.sectionTitle}>DEVELOPER TOOLS</Text>

                <TouchableOpacity style={styles.button} onPress={onOpenDevConsole}>
                    <Text style={styles.buttonText}>Open System Console</Text>
                    <Text style={styles.buttonSubtext}>View Live Logistics & Engine Output</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>

                <TouchableOpacity style={styles.button} onPress={handleExport}>
                    <Text style={styles.buttonText}>Export 30-Day Data</Text>
                    <Text style={styles.buttonSubtext}>Copy raw JSON to clipboard/share</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.button} onPress={handleViewData}>
                    <Text style={styles.buttonText}>View Stored Data</Text>
                    <Text style={styles.buttonSubtext}>Inspect historical records</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>DANGER ZONE</Text>
                <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleReset}>
                    <Text style={[styles.buttonText, styles.dangerText]}>Reset to Day Zero</Text>
                    <Text style={styles.buttonSubtext}>Clear all databases & flags</Text>
                </TouchableOpacity>
            </View>

            <DataViewerModal
                visible={showDataModal}
                onClose={() => setShowDataModal(false)}
                data={historicalData}
            />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', // Slate-900
        padding: 16,
    },
    settingsContainer: {
        gap: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    button: {
        backgroundColor: '#1E293B',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155',
    },
    dangerButton: {
        borderColor: '#7F1D1D',
        backgroundColor: '#450A0A',
    },
    buttonText: {
        color: '#E2E8F0',
        fontSize: 16,
        fontWeight: '600',
    },
    dangerText: {
        color: '#FCA5A5',
    },
    buttonSubtext: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#334155',
        marginVertical: 10,
    },
});
