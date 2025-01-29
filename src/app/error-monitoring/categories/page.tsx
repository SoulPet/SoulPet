'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ErrorSeverity } from '@/lib/error-alert';
import { ErrorCategory, errorClassification } from '@/lib/error-classification';
import { useState } from 'react';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<ErrorCategory[]>(
        errorClassification.getCategories()
    );
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState<Omit<ErrorCategory, 'id'>>({
        name: '',
        description: '',
        patterns: [{ field: 'name', pattern: '' }],
        severity: ErrorSeverity.Medium,
        tags: [],
    });

    const handleAddCategory = () => {
        const category = errorClassification.addCategory(newCategory);
        setCategories([...categories, category]);
        setIsAddingCategory(false);
        setNewCategory({
            name: '',
            description: '',
            patterns: [{ field: 'name', pattern: '' }],
            severity: ErrorSeverity.Medium,
            tags: [],
        });
    };

    const handleUpdateCategory = (
        id: string,
        updates: Partial<ErrorCategory>
    ) => {
        errorClassification.updateCategory(id, updates);
        setCategories(
            categories.map((category) =>
                category.id === id ? { ...category, ...updates } : category
            )
        );
    };

    const handleDeleteCategory = (id: string) => {
        errorClassification.deleteCategory(id);
        setCategories(categories.filter((category) => category.id !== id));
    };

    const handleAddPattern = (categoryId?: string) => {
        if (categoryId) {
            const category = categories.find((c) => c.id === categoryId);
            if (category) {
                handleUpdateCategory(categoryId, {
                    patterns: [...category.patterns, { field: 'name', pattern: '' }],
                });
            }
        } else {
            setNewCategory({
                ...newCategory,
                patterns: [...newCategory.patterns, { field: 'name', pattern: '' }],
            });
        }
    };

    const handleRemovePattern = (categoryId: string, index: number) => {
        const category = categories.find((c) => c.id === categoryId);
        if (category) {
            handleUpdateCategory(categoryId, {
                patterns: category.patterns.filter((_, i) => i !== index),
            });
        }
    };

    const handleAddTag = (categoryId?: string) => {
        if (categoryId) {
            const category = categories.find((c) => c.id === categoryId);
            if (category) {
                handleUpdateCategory(categoryId, {
                    tags: [...category.tags, { name: '', value: '' }],
                });
            }
        } else {
            setNewCategory({
                ...newCategory,
                tags: [...newCategory.tags, { name: '', value: '' }],
            });
        }
    };

    const handleRemoveTag = (categoryId: string, index: number) => {
        const category = categories.find((c) => c.id === categoryId);
        if (category) {
            handleUpdateCategory(categoryId, {
                tags: category.tags.filter((_, i) => i !== index),
            });
        }
    };

    return (
        <div className="container py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Error Categories</h1>
                <p className="text-muted-foreground">
                    Manage error classification rules for automatic error categorization
                    and tagging
                </p>
            </div>

            <div className="space-y-6">
                <div className="flex justify-end">
                    <Button
                        onClick={() => setIsAddingCategory(true)}
                        disabled={isAddingCategory}
                    >
                        Add Category
                    </Button>
                </div>

                {isAddingCategory && (
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">New Category</h3>
                        <div className="space-y-4">
                            <div>
                                <Label>Category Name</Label>
                                <Input
                                    value={newCategory.name}
                                    onChange={(e) =>
                                        setNewCategory({
                                            ...newCategory,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="Enter category name"
                                />
                            </div>

                            <div>
                                <Label>Description</Label>
                                <Textarea
                                    value={newCategory.description}
                                    onChange={(e) =>
                                        setNewCategory({
                                            ...newCategory,
                                            description: e.target.value,
                                        })
                                    }
                                    placeholder="Enter category description"
                                />
                            </div>

                            <div>
                                <Label>Severity</Label>
                                <Select
                                    value={newCategory.severity}
                                    onValueChange={(value) =>
                                        setNewCategory({
                                            ...newCategory,
                                            severity: value as ErrorSeverity,
                                        })
                                    }
                                >
                                    {Object.values(ErrorSeverity).map((severity) => (
                                        <option key={severity} value={severity}>
                                            {severity}
                                        </option>
                                    ))}
                                </Select>
                            </div>

                            <div>
                                <Label>Matching Patterns</Label>
                                <div className="space-y-2">
                                    {newCategory.patterns.map((pattern, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Select
                                                value={pattern.field}
                                                onValueChange={(value) =>
                                                    setNewCategory({
                                                        ...newCategory,
                                                        patterns: newCategory.patterns.map((p, i) =>
                                                            i === index
                                                                ? {
                                                                    ...p,
                                                                    field: value as keyof ErrorReport,
                                                                }
                                                                : p
                                                        ),
                                                    })
                                                }
                                            >
                                                <option value="name">Name</option>
                                                <option value="message">Message</option>
                                            </Select>
                                            <Input
                                                value={pattern.pattern}
                                                onChange={(e) =>
                                                    setNewCategory({
                                                        ...newCategory,
                                                        patterns: newCategory.patterns.map((p, i) =>
                                                            i === index
                                                                ? {
                                                                    ...p,
                                                                    pattern: e.target.value,
                                                                }
                                                                : p
                                                        ),
                                                    })
                                                }
                                                placeholder="Enter matching pattern"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setNewCategory({
                                                        ...newCategory,
                                                        patterns: newCategory.patterns.filter(
                                                            (_, i) => i !== index
                                                        ),
                                                    })
                                                }
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddPattern()}
                                    >
                                        Add Pattern
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label>Tags</Label>
                                <div className="space-y-2">
                                    {newCategory.tags.map((tag, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <Input
                                                value={tag.name}
                                                onChange={(e) =>
                                                    setNewCategory({
                                                        ...newCategory,
                                                        tags: newCategory.tags.map((t, i) =>
                                                            i === index
                                                                ? {
                                                                    ...t,
                                                                    name: e.target.value,
                                                                }
                                                                : t
                                                        ),
                                                    })
                                                }
                                                placeholder="Tag name"
                                            />
                                            <Input
                                                value={tag.value}
                                                onChange={(e) =>
                                                    setNewCategory({
                                                        ...newCategory,
                                                        tags: newCategory.tags.map((t, i) =>
                                                            i === index
                                                                ? {
                                                                    ...t,
                                                                    value: e.target.value,
                                                                }
                                                                : t
                                                        ),
                                                    })
                                                }
                                                placeholder="Tag value"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    setNewCategory({
                                                        ...newCategory,
                                                        tags: newCategory.tags.filter(
                                                            (_, i) => i !== index
                                                        ),
                                                    })
                                                }
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddTag()}
                                    >
                                        Add Tag
                                    </Button>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsAddingCategory(false)}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleAddCategory}>Save</Button>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="space-y-4">
                    {categories.map((category) => (
                        <Card key={category.id} className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold">{category.name}</h3>
                                    {category.description && (
                                        <p className="text-sm text-muted-foreground">
                                            {category.description}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteCategory(category.id)}
                                >
                                    Delete
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label>Severity</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {category.severity}
                                    </p>
                                </div>

                                <div>
                                    <Label>Matching Patterns</Label>
                                    <div className="space-y-2">
                                        {category.patterns.map((pattern, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Select
                                                    value={pattern.field}
                                                    onValueChange={(value) =>
                                                        handleUpdateCategory(category.id, {
                                                            patterns: category.patterns.map((p, i) =>
                                                                i === index
                                                                    ? {
                                                                        ...p,
                                                                        field: value as keyof ErrorReport,
                                                                    }
                                                                    : p
                                                            ),
                                                        })
                                                    }
                                                >
                                                    <option value="name">Name</option>
                                                    <option value="message">Message</option>
                                                </Select>
                                                <Input
                                                    value={pattern.pattern}
                                                    onChange={(e) =>
                                                        handleUpdateCategory(category.id, {
                                                            patterns: category.patterns.map((p, i) =>
                                                                i === index
                                                                    ? {
                                                                        ...p,
                                                                        pattern: e.target.value,
                                                                    }
                                                                    : p
                                                            ),
                                                        })
                                                    }
                                                    placeholder="Enter matching pattern"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleRemovePattern(category.id, index)
                                                    }
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleAddPattern(category.id)}
                                        >
                                            Add Pattern
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <Label>Tags</Label>
                                    <div className="space-y-2">
                                        {category.tags.map((tag, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Input
                                                    value={tag.name}
                                                    onChange={(e) =>
                                                        handleUpdateCategory(category.id, {
                                                            tags: category.tags.map((t, i) =>
                                                                i === index
                                                                    ? {
                                                                        ...t,
                                                                        name: e.target.value,
                                                                    }
                                                                    : t
                                                            ),
                                                        })
                                                    }
                                                    placeholder="Tag name"
                                                />
                                                <Input
                                                    value={tag.value}
                                                    onChange={(e) =>
                                                        handleUpdateCategory(category.id, {
                                                            tags: category.tags.map((t, i) =>
                                                                i === index
                                                                    ? {
                                                                        ...t,
                                                                        value: e.target.value,
                                                                    }
                                                                    : t
                                                            ),
                                                        })
                                                    }
                                                    placeholder="Tag value"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveTag(category.id, index)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleAddTag(category.id)}
                                        >
                                            Add Tag
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
