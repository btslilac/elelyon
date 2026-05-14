'use client';

import HeaderBox from "@/components/HeaderBox";
import { createClient, uploadClientPhoto } from "@/lib/actions/client.actions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, UserPlus, Phone, FileText, MapPin, AlertCircle, Loader2, Camera } from "lucide-react";
import FileUpload from "@/components/FileUpload";

export default function CreateClientPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<{ base64: string; name: string; mimeType: string } | null>(null);
  const [uploadStep, setUploadStep] = useState<"idle" | "uploading" | "saving">("idle");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    // use a temp UUID as placeholder; replaced after client is created
    const tempId = crypto.randomUUID();

    startTransition(async () => {
      try {
        let photoUrl: string | undefined;
        let photoPath: string | undefined;

        if (photoData) {
          setUploadStep("uploading");
          const uploaded = await uploadClientPhoto(
            tempId,
            photoData.base64,
            photoData.name,
            photoData.mimeType
          );
          if (uploaded) {
            photoUrl = uploaded.url;
            photoPath = uploaded.path;
          }
          setUploadStep("saving");
        }

        const result = await createClient({
          firstName,
          lastName,
          nationalId: formData.get("nationalId") as string,
          email: formData.get("email") as string,
          phone: formData.get("phone") as string,
          address: formData.get("address") as string,
          profilePhotoUrl: photoUrl,
          profilePhotoPath: photoPath,
        });

        setUploadStep("idle");
        if (result) {
          router.push("/clients");
          router.refresh();
        } else {
          setError("Registration failed. Please try again.");
        }
      } catch (err: any) {
        setUploadStep("idle");
        setError(err?.message || "An unexpected error occurred.");
      }
    });
  };

  const isLoading = isPending || uploadStep !== "idle";

  return (
    <section className="home-content">
      <header className="mb-6">
        <HeaderBox
          title="Borrower Registration"
          subtext="Onboard a new client into the lending ecosystem."
        />
      </header>

      <section className="flex-1">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8 max-w-4xl">

          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="size-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-14 font-semibold text-red-700">Registration Failed</p>
                <p className="text-13 text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Photo Upload Column */}
            <div className="lg:col-span-1">
               <div className="card-premium p-6 h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary/5 rounded-lg text-primary">
                      <Camera className="size-5" />
                    </div>
                    <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Profile Photo</h3>
                  </div>
                  
                  <FileUpload
                    onFileDataReady={setPhotoData}
                    className="mt-2"
                  />
                  <p className="text-12 text-gray-500 mt-4 leading-relaxed">
                    A clear profile photo helps in identifying the borrower during field visits and repayments.
                  </p>
               </div>
            </div>

            {/* Form Fields Column */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              {/* Personal Details Section */}
              <div className="card-premium p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/5 rounded-lg text-primary">
                    <UserPlus className="size-5" />
                  </div>
                  <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Personal Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">First Name</label>
                    <input type="text" name="firstName" required placeholder="e.g. John" className="input-class" disabled={isPending || isUploading} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Last Name</label>
                    <input type="text" name="lastName" required placeholder="e.g. Doe" className="input-class" disabled={isPending || isUploading} />
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="size-3.5" />
                      National ID / Passport
                    </label>
                    <input type="text" name="nationalId" required placeholder="Enter ID Number" className="input-class font-mono" disabled={isPending || isUploading} />
                  </div>
                </div>
              </div>

              {/* Contact & Location Section */}
              <div className="card-premium p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/5 rounded-lg text-primary">
                    <Phone className="size-5" />
                  </div>
                  <h3 className="text-16 font-semibold text-gray-900 tracking-tight">Contact Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Phone Number</label>
                    <input type="tel" name="phone" required placeholder="+254 7..." className="input-class" disabled={isPending || isUploading} />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest">Email Address</label>
                    <input type="email" name="email" placeholder="john@example.com" className="input-class" disabled={isPending || isUploading} />
                  </div>

                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-12 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="size-3.5" />
                      Residential Address
                    </label>
                    <input type="text" name="address" placeholder="Physical location details" className="input-class" disabled={isPending || isUploading} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{uploadStep === 'uploading' ? 'Uploading photo…' : 'Registering…'}</span>
                </>
              ) : (
                <>
                  <span>Register Client</span>
                  <ArrowRight className="size-4 opacity-70" />
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </section>
  );
}

