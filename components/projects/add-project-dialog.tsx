"use client";

import { useRef, useState } from "react";
import { createProject, type Project, type ProjectType, type SizeUnit } from "@/lib/api";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { AlertCircle, ImageIcon, Loader2, X } from "lucide-react";

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
    { value: "plot", label: "Plot" },
    { value: "apartment", label: "Apartment" },
    { value: "house", label: "House" },
    { value: "portion", label: "Portion" },
    { value: "office", label: "Office" },
    { value: "townhouse", label: "Townhouse" },
];

const SIZE_UNITS: { value: SizeUnit; label: string }[] = [
    { value: "marla", label: "Marla" },
    { value: "sqft", label: "Sqft" },
];

interface FormState {
    name: string;
    address: string;
    type: string;
    price: string;
    size: string;
    size_unit: string;
    form_id: string;
}

const EMPTY_FORM: FormState = {
    name: "",
    address: "",
    type: "plot",
    price: "",
    size: "",
    size_unit: "marla",
    form_id: "",
};

interface AddProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (project: Project) => void;
}

export function AddProjectDialog({ open, onOpenChange, onSuccess }: AddProjectDialogProps) {
    const [form, setForm] = useState<FormState>(EMPTY_FORM);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    function set(field: keyof FormState, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    }

    function removeImage() {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function validate(): boolean {
        const errors: Partial<Record<keyof FormState, string>> = {};
        if (!form.name.trim()) errors.name = "Project name is required";
        if (!form.address.trim()) errors.address = "Address is required";
        if (!form.size || isNaN(Number(form.size)) || Number(form.size) <= 0)
            errors.size = "Valid size is required";
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    }

    function handleClose(open: boolean) {
        if (!open) {
            setForm(EMPTY_FORM);
            setImageFile(null);
            setImagePreview(null);
            setError(null);
            setFieldErrors({});
        }
        onOpenChange(open);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        setError(null);

        const data = new FormData();
        data.append("name", form.name.trim());
        data.append("address", form.address.trim());
        data.append("type", form.type);
        data.append("size", form.size);
        data.append("size_unit", form.size_unit);
        if (form.price) data.append("price", form.price);
        if (form.form_id.trim()) data.append("form_id", form.form_id.trim());
        if (imageFile) data.append("image", imageFile);

        try {
            const created = await createProject(data);
            onSuccess?.(created);
            handleClose(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Add New Project</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Fill in the details below to create a new project.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="grid gap-5 py-4">
                        {error && (
                            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Project Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="proj-name">
                                Project Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="proj-name"
                                placeholder="e.g. Marina Heights"
                                value={form.name}
                                onChange={(e) => set("name", e.target.value)}
                                className={fieldErrors.name ? "border-destructive" : ""}
                            />
                            {fieldErrors.name && (
                                <p className="text-xs text-destructive">{fieldErrors.name}</p>
                            )}
                        </div>

                        {/* Address */}
                        <div className="space-y-1.5">
                            <Label htmlFor="proj-address">
                                Address <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="proj-address"
                                placeholder="e.g. DHA Phase 6, Lahore"
                                value={form.address}
                                onChange={(e) => set("address", e.target.value)}
                                className={fieldErrors.address ? "border-destructive" : ""}
                            />
                            {fieldErrors.address && (
                                <p className="text-xs text-destructive">{fieldErrors.address}</p>
                            )}
                        </div>

                        {/* Type */}
                        <div className="space-y-1.5">
                            <Label>Type</Label>
                            <Select value={form.type} onValueChange={(v) => set("type", v)}>
                                <SelectTrigger id="proj-type">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PROJECT_TYPES.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                            {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Size + Unit */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="proj-size">
                                    Size <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="proj-size"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="e.g. 10"
                                    value={form.size}
                                    onChange={(e) => set("size", e.target.value)}
                                    className={fieldErrors.size ? "border-destructive" : ""}
                                />
                                {fieldErrors.size && (
                                    <p className="text-xs text-destructive">{fieldErrors.size}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label>Unit</Label>
                                <Select value={form.size_unit} onValueChange={(v) => set("size_unit", v)}>
                                    <SelectTrigger id="proj-unit">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SIZE_UNITS.map((u) => (
                                            <SelectItem key={u.value} value={u.value}>
                                                {u.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Price */}
                        <div className="space-y-1.5">
                            <Label htmlFor="proj-price">Price (PKR)</Label>
                            <Input
                                id="proj-price"
                                type="number"
                                min={0}
                                placeholder="e.g. 5000000"
                                value={form.price}
                                onChange={(e) => set("price", e.target.value)}
                            />
                        </div>

                        {/* Form ID */}
                        <div className="space-y-1.5">
                            <Label htmlFor="proj-form-id">Form ID (optional)</Label>
                            <Input
                                id="proj-form-id"
                                placeholder="External form identifier"
                                value={form.form_id}
                                onChange={(e) => set("form_id", e.target.value)}
                            />
                        </div>

                        {/* Image upload */}
                        <div className="space-y-1.5">
                            <Label>Image (optional)</Label>
                            {imagePreview ? (
                                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-border">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={imagePreview}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1 hover:bg-background transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-colors text-muted-foreground"
                                >
                                    <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                                    <span className="text-sm">Click to upload an image</span>
                                    <span className="text-xs mt-1 opacity-70">PNG, JPG, WEBP</span>
                                </button>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageChange}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleClose(false)}
                            disabled={submitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={submitting} className="gap-2">
                            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {submitting ? "Creating…" : "Create Project"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
