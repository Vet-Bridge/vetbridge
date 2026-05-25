import ClinicPatientDetailClient from "./ClinicPatientDetailClient";

type ClinicPatientDetailPageProps = {
  params: Promise<{ patientId: string }>;
};

export default async function ClinicPatientDetailPage({ params }: ClinicPatientDetailPageProps) {
  const { patientId } = await params;

  return <ClinicPatientDetailClient patientId={patientId} />;
}
