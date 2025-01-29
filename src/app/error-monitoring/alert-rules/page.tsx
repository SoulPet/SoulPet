'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    AlertAction,
    AlertRule,
    ErrorSeverity,
    errorAlert,
} from '@/lib/error-alert';
import { useState } from 'react';

export default function AlertRulesPage() {
    const [rules, setRules] = useState<AlertRule[]>(errorAlert.getRules());
    const [isAddingRule, setIsAddingRule] = useState(false);
    const [newRule, setNewRule] = useState<Omit<AlertRule, 'id'>>({
        name: '',
        condition: {
            threshold: 1,
            timeWindow: 3600000, // 1 hour
        },
        actions: [],
        enabled: true,
    });

    const handleAddRule = () => {
        const rule = errorAlert.addRule(newRule);
        setRules([...rules, rule]);
        setIsAddingRule(false);
        setNewRule({
            name: '',
            condition: {
                threshold: 1,
                timeWindow: 3600000,
            },
            actions: [],
            enabled: true,
        });
    };

    const handleUpdateRule = (id: string, updates: Partial<AlertRule>) => {
        errorAlert.updateRule(id, updates);
        setRules(
            rules.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule))
        );
    };

    const handleDeleteRule = (id: string) => {
        errorAlert.deleteRule(id);
        setRules(rules.filter((rule) => rule.id !== id));
    };

    const handleAddAction = (ruleId: string, action: AlertAction) => {
        const rule = rules.find((r) => r.id === ruleId);
        if (rule) {
            const updatedRule = {
                ...rule,
                actions: [...rule.actions, action],
            };
            handleUpdateRule(ruleId, updatedRule);
        }
    };

    const handleRemoveAction = (ruleId: string, index: number) => {
        const rule = rules.find((r) => r.id === ruleId);
        if (rule) {
            const updatedRule = {
                ...rule,
                actions: rule.actions.filter((_, i) => i !== index),
            };
            handleUpdateRule(ruleId, updatedRule);
        }
    };

    return (
        <div className="container py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Alert Rules</h1>
                <p className="text-muted-foreground">
                    Configure error alert rules to trigger actions when errors meet
                    specified conditions
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex justify-end">
                    <Button onClick={() => setIsAddingRule(true)} disabled={isAddingRule}>
                        Add Rule
                    </Button>
                </div>

                {isAddingRule && (
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">New Rule</h3>
                        <div className="space-y-4">
                            <div>
                                <Label>Rule Name</Label>
                                <Input
                                    value={newRule.name}
                                    onChange={(e) =>
                                        setNewRule({
                                            ...newRule,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="Enter rule name"
                                />
                            </div>

                            <div>
                                <Label>Error Type</Label>
                                <Input
                                    value={newRule.condition.errorType || ''}
                                    onChange={(e) =>
                                        setNewRule({
                                            ...newRule,
                                            condition: {
                                                ...newRule.condition,
                                                errorType: e.target.value,
                                            },
                                        })
                                    }
                                    placeholder="Enter error type (optional)"
                                />
                            </div>

                            <div>
                                <Label>Severity</Label>
                                <Select
                                    value={newRule.condition.severity}
                                    onValueChange={(value) =>
                                        setNewRule({
                                            ...newRule,
                                            condition: {
                                                ...newRule.condition,
                                                severity: value as ErrorSeverity,
                                            },
                                        })
                                    }
                                >
                                    <option value="">Any</option>
                                    {Object.values(ErrorSeverity).map((severity) => (
                                        <option key={severity} value={severity}>
                                            {severity}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <Label>Threshold</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={newRule.condition.threshold}
                                    onChange={(e) =>
                                        setNewRule({
                                            ...newRule,
                                            condition: {
                                                ...newRule.condition,
                                                threshold: parseInt(e.target.value),
                                            },
                                        })
                                    }
                                />
                            </div>

                            <div>
                                <Label>Time Window (Hours)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={newRule.condition.timeWindow / 3600000}
                                    onChange={(e) =>
                                        setNewRule({
                                            ...newRule,
                                            condition: {
                                                ...newRule.condition,
                                                timeWindow: parseInt(e.target.value) * 3600000,
                                            },
                                        })
                                    }
                                />
                            </div>

                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAddingRule(false)}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleAddRule}>Save</Button>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="space-y-4">
                    {rules.map((rule) => (
                        <Card key={rule.id} className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">{rule.name}</h3>
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={rule.enabled}
                                        onCheckedChange={(checked) =>
                                            handleUpdateRule(rule.id, {
                                                enabled: checked,
                                            })
                                        }
                                    />
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteRule(rule.id)}
                                    >
                                        Delete
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label>Conditions</Label>
                                    <div className="text-sm text-muted-foreground">
                                        {rule.condition.errorType && (
                                            <p>Error Type: {rule.condition.errorType}</p>
                                        )}
                                        {rule.condition.severity && (
                                            <p>Severity: {rule.condition.severity}</p>
                                        )}
                                        <p>
                                            Threshold: {rule.condition.threshold} times /{' '}
                                            {rule.condition.timeWindow / 3600000} hours
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <Label>Actions</Label>
                                    <div className="space-y-2">
                                        {rule.actions.map((action, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="font-medium">{action.type}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {action.config.recipients?.join(', ') ||
                                                            action.config.webhookUrl ||
                                                            action.config.channel}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveAction(rule.id, index)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                handleAddAction(rule.id, {
                                                    type: 'email',
                                                    config: { recipients: [] },
                                                })
                                            }
                                        >
                                            Add Action
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
