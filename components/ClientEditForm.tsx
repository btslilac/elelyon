'use client';

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, MapPin, Phone, Mail, FileText, ArrowRight, Loader2, Camera, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";
import { updateClient, uploadClientPhoto } from "@/lib/actions/client.actions";
import FileUpload from "@/components/FileUpload";

interface ClientEditFormProps {
  client: LMSClient;
}

export default function ClientEditForm({ client }: ClientEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [photoData, setPhotoData] = useState<{ base64: string; name: string; mimeType: string } | null>(null);
  const [uploadStep, setUploadStep] = useState<"idle" | "uploading" | "saving">("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        let photoUrl = client.profilePhotoUrl;
        let photoPath = client.profilePhotoPath;

        // Step 1: Upload photo via server action if new photo selected
        if (photoData) {
          setUploadStep("uploading");
          const uploaded = await uploadClientPhoto(
            client.$id,
            photoData.base64,
            photoData.name,
            photoData.mimeType,
            client.profilePhotoPath // deletes old photo automatically
          );
          if (uploaded) {
            photoUrl = uploaded.url;
            photoPath = uploaded.path;
          } else {
            throw new Error("Photo upload failed. Please try again.");
          }
        }

        // Step 2: Save profile data
        setUploadStep("saving");
        const result = await updateClient(client.$id, {
          firstName: formData.get("firstName") as string,
          lastName: formData.get("lastName") as string,
          nationalId: formData.get("nationalId") as string,
          email: formData.get("email") as string,
          phone: formData.get("phone") as string,
          address: formData.get("address") as string,
          ...(photoUrl !== undefined && { profilePhotoUrl: photoUrl }),
          ...(photoPath !== undefined && { profilePhotoPath: photoPath }),
        });

        if (result) {
          setSuccess(true);
          setUploadStep("idle");
          setTimeout(() => router.push(`/clients/${client.$id}`), 800);
        } else {
          throw new Error("Failed to save profile. Please try again.");
        }
      } catch (err: any) {
        setUploadStep("idle");
        setError(err?.message || "An unexpected error occurred.");
      }
    });
  };

  const isLoading = isPending || uploadStep !== "idle";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 max-w-4xl">
      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-14 font-semibold text-red-700">Update Failed</p>
            <p className="text-13 text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle className="size-5 text-emerald-500 flex-shrink-0" />
          <p className="text-14 font-semibold text-emerald-700">Profile updated successfully. Redirecting…</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Photo Upload Column */}
        <div className="lg:col-span-1">
          <div className="card-premium p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/5 rounded-lg text-primary">
                <Camera className="size-5" />
              </div>
              <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Profile Photo</h3>
            </div>

            <FileUpload
              onFileDataReady={setPhotoData}
              existingUrl={client.profilePhotoUrl}
              className="flex-1"
            />
            <p className="text-12 text-gray-400 mt-4 leading-relaxed">
              Drag & drop or click to replace. Max 5MB. JPG, PNG or WEBP.
            </p>
          </div>
        </div>

        {/* Form Fields Column */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Personal Information */}
          <div className="card-premium p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/5 rounded-lg text-primary">
                <UserCheck className="size-5" />
              </div>
              <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Personal Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">First Name</label>
                <input type="text" name="firstName" defaultValue={client.firstName} required className="input-class" disabled={isLoading} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Last Name</label>
                <input type="text" name="lastName" defaultValue={client.lastName} required className="input-class" disabled={isLoading} />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <FileText className="size-3.5" /> National ID / Passport
                </label>
                <input type="text" name="nationalId" defaultValue={client.nationalId} required className="input-class font-mono" disabled={isLoading} />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="card-premium p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/5 rounded-lg text-primary">
                <Phone className="size-5" />
              </div>
              <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Contact Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Phone className="size-3.5" /> Phone Number
                </label>
                <input type="tel" name="phone" defaultValue={client.phone} required className="input-class" disabled={isLoading} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Mail className="size-3.5" /> Email Address
                </label>
                <input type="email" name="email" defaultValue={client.email} className="input-class" disabled={isLoading} />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="size-3.5" /> Physical Address
                </label>
                <input type="text" name="address" defaultValue={client.address} className="input-class" disabled={isLoading} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end pt-2 gap-4">
        <Link href={`/clients/${client.$id}`} className="btn-secondary h-12 px-8">
          Cancel
        </Link>
        <button type="submit" className="btn-submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>
                {uploadStep === "uploading" ? "Uploading photo…" : "Saving changes…"}
              </span>
            </>
          ) : (
            <>
              <span>Save Changes</span>
              <ArrowRight className="size-4 opacity-70" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
