import { AssessmentExperience } from "../../../components/experience";

export default async function AssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssessmentExperience id={id} />;
}
