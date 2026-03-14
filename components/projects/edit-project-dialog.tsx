"use client";

import { useRef, useState, useEffect } from "react";
import { updateProject, type Project, type ProjectType, type SizeUnit } from "@/lib/api";
import { toast } from "sonner";

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
import { ImageIcon, Loader2, X } from "lucide-react";

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

interface EditProjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    project: Project | null;
    onSuccess?: (project: Project) => void;
}

export function EditProjectDialog({ open, onOpenChange, project, onSuccess }: EditProjectDialogProps) {
    const [form, setForm] = useState<FormState>({
        name: "",
        address: "",
        type: "plot",
        price: "",
        size: "",
        size_unit: "marla",
        form_id: "",
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [removeExistingImage, setRemoveExistingImage] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open && project) {
            setForm({
                name: project.name || "",
                address: project.address || "",
                type: project.type || "plot",
                price: project.price ? String(project.price) : "",
                size: project.size ? String(project.size) : "",
                size_unit: project.size_unit || "marla",
                form_id: project.form_id || "",
            });
            setImagePreview(project.image || null);
            setImageFile(null);
            setRemoveExistingImage(false);
            setFieldErrors({});
        } else if (!open) {
            setImagePreview(null);
            setImageFile(null);
        }
    }, [open, project]);

    function set(field: keyof FormState, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setRemoveExistingImage(false);
    }

    function removeImage() {
        setImageFile(null);
        setImagePreview(null);
        setRemoveExistingImage(true);
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
        onOpenChange(open);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!validate() || !project) return;

        setSubmitting(true);

        const data = new FormData();
        data.append("name", form.name.trim());
        data.append("address", form.address.trim());
        data.append("type", form.type);
        data.append("size", form.size);
        data.append("size_unit", form.size_unit);
        if (form.price) data.append("price", form.price);
        else data.append("price", ""); // clear price if empty

        if (form.form_id.trim()) data.append("form_id", form.form_id.trim());
        else data.append("form_id", ""); // clear form_id if empty

        if (imageFile) {
            data.append("image", imageFile);
        } else if (removeExistingImage) {
            data.append("image", "");
        }

        try {
            const updated = await updateProject(project.id, data);
            toast.success("Project updated successfully");
            onSuccess?.(updated);
            handleClose(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg font-semibold">Edit Project</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Update the details for this project.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} noValidate>
                    <div className="grid gap-5 py-4">
                        {/* Project Name */}
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-proj-name">
                                Project Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit-proj-name"
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
                            <Label htmlFor="edit-proj-address">
                                Address <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit-proj-address"
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
                                <SelectTrigger id="edit-proj-type">
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
                                <Label htmlFor="edit-proj-size">
                                    Size <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="edit-proj-size"
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
                                    <SelectTrigger id="edit-proj-unit">
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
                            <Label htmlFor="edit-proj-price">Price (PKR)</Label>
                            <Input
                                id="edit-proj-price"
                                type="number"
                                min={0}
                                placeholder="e.g. 5000000"
                                value={form.price}
                                onChange={(e) => set("price", e.target.value)}
                            />
                        </div>

                        {/* Form ID */}
                        <div className="space-y-1.5">
                            <Label htmlFor="edit-proj-form-id">Form ID (optional)</Label>
                            <Input
                                id="edit-proj-form-id"
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
                            {submitting ? "Saving…" : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
