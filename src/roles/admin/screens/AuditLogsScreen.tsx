import AdministrationPages from "../../../features/administration/AdministrationPages";
type Props = { onAction: (message: string) => void };
export default function AuditLogsScreen({ onAction }: Props) { return <AdministrationPages onAction={onAction} initialView="audit" />; }
