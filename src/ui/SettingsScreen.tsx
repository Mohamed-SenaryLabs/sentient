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

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import { Screen } from './components/Screen';
import { OperatorDailyStats } from '../data/schema';
import { DataViewerModal } from './DataViewerModal';
import { colors, typography, spacing, radius } from './theme/tokens';

interface SettingsScreenProps {
    stats: OperatorDailyStats | null;
    onOpenDevConsole: () => void;
    onExportData: () => Promise<string>;
    onGetHistoricalData: () => Promise<OperatorDailyStats[]>;
    onResetDatabase: () => Promise<void>;
    onTriggerGoalsIntake: () => Promise<void>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ 
    stats,
    onOpenDevConsole,
    onExportData,
    onGetHistoricalData,
    onResetDatabase,
    onTriggerGoalsIntake,
}) => {
    const [showDataModal, setShowDataModal] = React.useState(false);
    const [historicalData, setHistoricalData] = React.useState<OperatorDailyStats[]>([]);
    const [traceExpanded, setTraceExpanded] = useState(false);

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

    // Helper: Format directive label
    const getDirectiveLabel = () => {
        if (!stats?.logicContract?.directive) return 'Calculating...';
        const directive = stats.logicContract.directive;
        return `${directive.category} — ${directive.stimulus_type}`;
    };

    const contract = stats?.logicContract;

    return (
        <Screen preset="scroll">
            <View style={styles.settingsContainer}>
                {/* DECISION TRACE */}
                {stats && (
                    <>
                        <Text style={[styles.sectionTitle, styles.firstSectionTitle]}>DECISION TRACE</Text>
                        <TouchableOpacity 
                            style={styles.traceCard} 
                            onPress={() => setTraceExpanded(!traceExpanded)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.traceHeader}>
                                <Text style={styles.traceTitle}>Logic Chain</Text>
                                <Text style={styles.expandIcon}>{traceExpanded ? '▼' : '▶'}</Text>
                            </View>
                            
                            <Text style={styles.traceDirective}>{getDirectiveLabel()}</Text>
                            
                            {traceExpanded && (
                                <View style={styles.traceDetails}>
                                    {/* 3-Day Arc */}
                                    {contract?.horizon && contract.horizon.length > 0 && (
                                        <View style={styles.traceSection}>
                                            <Text style={styles.traceSectionTitle}>3-DAY STRATEGIC ARC</Text>
                                            {contract.horizon.map((day, i) => (
                                                <Text key={i} style={styles.traceItem}>
                                                    Day {day.dayOffset}: {day.directive.category} — {day.directive.stimulus_type}
                                                    {day.state && ` (${day.state})`}
                                                </Text>
                                            ))}
                                        </View>
                                    )}

                                    {/* Vitality Calculation */}
                                    <View style={styles.traceSection}>
                                        <Text style={styles.traceSectionTitle}>VITALITY CALCULATION</Text>
                                        <Text style={styles.traceItem}>Score: {stats.stats.vitality}%</Text>
                                        <Text style={styles.traceItem}>Confidence: {stats.stats.vitalityConfidence || 'HIGH'}</Text>
                                        {stats.stats.vitalityZScore !== undefined && (
                                            <Text style={styles.traceItem}>Z-Score: {stats.stats.vitalityZScore.toFixed(2)}</Text>
                                        )}
                                        {stats.stats.isVitalityEstimated && (
                                            <Text style={styles.traceItem}>⚠ Estimated (incomplete data)</Text>
                                        )}
                                    </View>

                                    {/* Evidence Summary */}
                                    {stats.stats.evidenceSummary && stats.stats.evidenceSummary.length > 0 && (
                                        <View style={styles.traceSection}>
                                            <Text style={styles.traceSectionTitle}>EVIDENCE</Text>
                                            {stats.stats.evidenceSummary.map((item, i) => (
                                                <Text key={i} style={styles.traceItem}>• {item}</Text>
                                            ))}
                                        </View>
                                    )}

                                    {/* System Status */}
                                    <View style={styles.traceSection}>
                                        <Text style={styles.traceSectionTitle}>SYSTEM STATUS</Text>
                                        <Text style={styles.traceItem}>State: {stats.stats.systemStatus.current_state}</Text>
                                        <Text style={styles.traceItem}>Lens: {stats.stats.systemStatus.active_lens}</Text>
                                        {stats.stats.systemStatus.dominantAxes && stats.stats.systemStatus.dominantAxes.length > 0 && (
                                            <Text style={styles.traceItem}>
                                                Dominant Axes: {stats.stats.systemStatus.dominantAxes.join(', ')}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Planner Reasoning */}
                                    {contract?.dominant_factors && contract.dominant_factors.length > 0 && (
                                        <View style={styles.traceSection}>
                                            <Text style={styles.traceSectionTitle}>PLANNER REASONING</Text>
                                            <Text style={styles.traceItem}>Dominant Factors:</Text>
                                            {contract.dominant_factors.map((factor, i) => (
                                                <Text key={i} style={styles.traceSubItem}>• {factor}</Text>
                                            ))}
                                        </View>
                                    )}

                                    {/* Analyst Insight */}
                                    {stats.activeSession?.analyst_insight && (
                                        <View style={styles.traceSection}>
                                            <Text style={styles.traceSectionTitle}>ANALYST INSIGHT</Text>
                                            <Text style={styles.traceText}>"{stats.activeSession.analyst_insight}"</Text>
                                        </View>
                                    )}

                                    {/* Constraints */}
                                    {contract?.constraints && (
                                        <View style={styles.traceSection}>
                                            <Text style={styles.traceSectionTitle}>CONSTRAINTS</Text>
                                            <Text style={styles.traceItem}>
                                                Impact Allowed: {contract.constraints.allow_impact ? 'Yes' : 'No'}
                                            </Text>
                                            {contract.constraints.heart_rate_cap && (
                                                <Text style={styles.traceItem}>
                                                    HR Cap: {contract.constraints.heart_rate_cap} bpm
                                                </Text>
                                            )}
                                            {contract.constraints.required_equipment && contract.constraints.required_equipment.length > 0 && (
                                                <Text style={styles.traceItem}>
                                                    Equipment: {contract.constraints.required_equipment.join(', ')}
                                                </Text>
                                            )}
                                        </View>
                                    )}

                                    {/* Load Density */}
                                    {stats.stats.loadDensity !== undefined && (
                                        <View style={styles.traceSection}>
                                            <Text style={styles.traceSectionTitle}>LOAD ANALYSIS</Text>
                                            <Text style={styles.traceItem}>72h Density: {Math.round(stats.stats.loadDensity)}</Text>
                                            <Text style={styles.traceItem}>Trend: {stats.stats.trends?.load_trend || 'Stable'}</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>

                        <View style={styles.divider} />
                    </>
                )}

                <Text style={styles.sectionTitle}>DEVELOPER TOOLS</Text>

                <TouchableOpacity style={styles.button} onPress={onOpenDevConsole}>
                    <Text style={styles.buttonText}>Open System Console</Text>
                    <Text style={styles.buttonSubtext}>View Live Logistics & Engine Output</Text>
                </TouchableOpacity>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>PREFERENCES</Text>

                <TouchableOpacity style={styles.button} onPress={onTriggerGoalsIntake}>
                    <Text style={styles.buttonText}>Edit Goals</Text>
                    <Text style={styles.buttonSubtext}>Update training focus and constraints</Text>
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
        </Screen>
    );
};

const styles = StyleSheet.create({
    settingsContainer: {
        paddingBottom: spacing[6],
    },
    sectionTitle: {
        ...typography.sectionLabel,
        color: colors.text.secondary,
        marginTop: spacing[5],
        marginBottom: spacing[3],
    },
    firstSectionTitle: {
        marginTop: 0,
    },
    button: {
        backgroundColor: colors.surface,
        padding: spacing[4],
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        marginBottom: spacing[2],
    },
    dangerButton: {
        borderColor: colors.accent.strain,
        backgroundColor: `${colors.accent.strain}15`,
    },
    buttonText: {
        ...typography.button,
        color: colors.text.primary,
    },
    dangerText: {
        color: colors.accent.strain,
    },
    buttonSubtext: {
        ...typography.meta,
        color: colors.text.secondary,
        marginTop: spacing[1],
    },
    divider: {
        height: 1,
        backgroundColor: colors.border.default,
        marginVertical: spacing[4],
    },
    // Decision Trace styles
    traceCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: spacing[4],
        marginBottom: spacing[3],
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    traceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[3],
    },
    traceTitle: {
        ...typography.body,
        color: colors.text.primary,
        fontWeight: '600',
    },
    expandIcon: {
        ...typography.body,
        color: colors.text.secondary,
        padding: spacing[1],
    },
    traceDirective: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text.primary,
        marginBottom: spacing[3],
    },
    traceDetails: {
        marginTop: spacing[2],
        paddingTop: spacing[3],
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
    },
    traceSection: {
        marginBottom: spacing[4],
    },
    traceSectionTitle: {
        ...typography.meta,
        color: colors.text.secondary,
        marginBottom: spacing[2],
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    traceItem: {
        ...typography.meta,
        color: colors.text.primary,
        marginBottom: spacing[2],
        lineHeight: 18,
    },
    traceSubItem: {
        ...typography.meta,
        color: colors.text.secondary,
        marginBottom: spacing[1],
        paddingLeft: spacing[2],
        lineHeight: 18,
    },
    traceText: {
        ...typography.meta,
        color: colors.text.secondary,
        fontStyle: 'italic',
        lineHeight: 18,
    },
});
