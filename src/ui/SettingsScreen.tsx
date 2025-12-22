/**
 * SettingsScreen — Pure Presentation
 * 
 * This screen has NO business logic. It:
 * - Receives callbacks from orchestrator
 * - Renders UI based on props
 * - Dispatches user actions via callbacks
 * 
 * NO IMPORTS from src/engine/, src/data/, or src/intelligence/
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { OperatorDailyStats } from '../data/schema';
import { DataViewerModal } from './DataViewerModal';
import { colors, typography, spacing, radius } from './theme/tokens';

interface SettingsScreenProps {
    onOpenDevConsole: () => void;
    onExportData: () => Promise<string>;
    onGetHistoricalData: () => Promise<OperatorDailyStats[]>;
    onResetDatabase: () => Promise<void>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
    onOpenDevConsole,
    onExportData,
    onGetHistoricalData,
    onResetDatabase,
}) => {
    const [showDataModal, setShowDataModal] = React.useState(false);
    const [historicalData, setHistoricalData] = React.useState<OperatorDailyStats[]>([]);

    const handleViewData = async () => {
        try {
            const data = await onGetHistoricalData();
            setHistoricalData(data);
            setShowDataModal(true);
        } catch (error) {
            Alert.alert('Error', 'Could not load data.');
        }
    };

    const handleExport = async () => {
        try {
            const exportData = await onExportData();
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
                        await onResetDatabase();
                        Alert.alert('System Reset Complete', 'Database cleared. Restart the app to see fresh content.');
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
        backgroundColor: colors.bg,
        padding: spacing[4],
    },
    settingsContainer: {
        gap: spacing[5],
        paddingBottom: spacing[7],
    },
    sectionTitle: {
        color: colors.text.secondary,
        fontSize: typography.sectionLabel.fontSize,
        fontWeight: typography.sectionLabel.fontWeight,
        marginBottom: spacing[2],
        letterSpacing: 1,
    },
    button: {
        backgroundColor: colors.surface,
        padding: spacing[4],
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border.default,
    },
    dangerButton: {
        borderColor: colors.accent.strain,
        backgroundColor: `${colors.accent.strain}15`,
    },
    buttonText: {
        color: colors.text.primary,
        fontSize: typography.body.fontSize,
        fontWeight: '600',
    },
    dangerText: {
        color: colors.accent.strain,
    },
    buttonSubtext: {
        color: colors.text.secondary,
        fontSize: typography.meta.fontSize,
        marginTop: spacing[1],
    },
    divider: {
        height: 1,
        backgroundColor: colors.border.default,
        marginVertical: spacing[3],
    },
});
