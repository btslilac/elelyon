import Link from "next/link";
import { Edit, Banknote, PlusCircle, FileDown, UserX, Shield, Calendar, Mail, Phone, Hash } from "lucide-react";
import ClientAvatar from "@/components/ClientAvatar";
import { cn } from "@/lib/utils";

interface ClientDetailsHeaderProps {
  client: LMSClient;
  penalties: any[];
}

export default function ClientDetailsHeader({ client, penalties }: ClientDetailsHeaderProps) {
  const activePenaltiesTotal = penalties
    .filter(p => p.status === 'Active')
    .reduce((acc, p) => acc + p.amount, 0);

  const isArrears = (client.outstandingBalance + activePenaltiesTotal) > 0;

  const joinDate = client.$createdAt ? new Date(client.$createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }) : 'N/A';

  return (
    <div className="flex flex-col gap-6">
      {/* Top Section: Info & Profile */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
          <ClientAvatar
            firstName={client.firstName}
            lastName={client.lastName}
            photoUrl={client.profilePhotoUrl}
            size="xl"
            className="shadow-soft border-4 border-white"
          />

          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-30 font-bold text-gray-900 tracking-tight">
                {client.firstName} {client.lastName}
              </h1>
              <div className="flex gap-2">
                <span className={cn(
                  "badge",
                  isArrears ? "badge-error" : "badge-success"
                )}>
                  {isArrears ? "Arrears" : "Active"}
                </span>
                <span className="badge badge-warning flex items-center gap-1">
                  <Shield className="size-3" />
                  Moderate Risk
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 mt-1">
              <div className="flex items-center gap-2 text-14 text-gray-500">
                <Hash className="size-4 text-gray-400" />
                <span className="font-medium">ID: {client.nationalId}</span>
              </div>
              <div className="flex items-center gap-2 text-14 text-gray-500">
                <Phone className="size-4 text-gray-400" />
                <span>{client.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-14 text-gray-500">
                <Mail className="size-4 text-gray-400" />
                <span>{client.email || 'No email provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-14 text-gray-500">
                <Calendar className="size-4 text-gray-400" />
                <span>Joined {joinDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap justify-center md:justify-end gap-2 max-w-md">
          <Link href={`/clients/${client.$id}/edit`} className="btn-secondary h-10 px-4">
            <Edit className="size-4" />
            <span>Edit Profile</span>
          </Link>
          {/*<button className="btn-primary h-10 px-4 bg-emerald-600 hover:bg-emerald-700">
            <Banknote className="size-4" />
            <span>Log Repayment</span>
          </button>
          <button className="btn-secondary h-10 px-4">
            <PlusCircle className="size-4" />
            <span>Add Penalty</span>
          </button>
          <button className="btn-secondary h-10 px-4">
            <FileDown className="size-4" />
            <span>Statement</span>
          </button>
          <button className="btn-secondary h-10 px-4 text-red-600 hover:text-white hover:bg-red-600">
            <UserX className="size-4" />
            <span>Suspend</span>
          </button>*/}
        </div>
      </div>
    </div>
  );
}
