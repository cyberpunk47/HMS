import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge, Card, Group, Loader, SimpleGrid, Text, Timeline } from "@mantine/core";
import { IconCalendarEvent, IconClipboardHeart, IconPill } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { getPatient } from "../../../Service/PatientProfileService";
import {
    getAppointmentsByPatient, getPrescriptionsByPatientId, getReportsByPatientId,
} from "../../../Service/AppointmentService";
import { formatDate, formatDateWithtime } from "../../../Utility/DateUtility";
import { bloodGroup } from "../../../data/DropdownData";

// Patient profile stores allergies / chronic diseases as a JSON array string (see Patient Profile page).
const parseList = (value: any): string[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
    } catch {
        return String(value).split(",").map((s) => s.trim()).filter(Boolean);
    }
};

const ageFromDob = (dob: any) => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
};

const statusColor: Record<string, string> = {
    SCHEDULED: "blue", COMPLETED: "green", CANCELLED: "red", EXPIRED: "gray",
};

const Info = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <Text size="xs" c="dimmed">{label}</Text>
        <div className="text-sm">{children}</div>
    </div>
);

/**
 * Medical history of the appointment's patient, built only from real HMS data:
 * ProfileMS patient profile + AppointmentMS appointments, reports and prescriptions.
 */
const MedicalHistory = ({ appointment }: any) => {
    const patientId = appointment?.patientId;
    const navigate = useNavigate();

    const profileQ = useQuery({
        queryKey: ["patientProfile", patientId],
        queryFn: () => getPatient(patientId),
        enabled: !!patientId,
    });
    const appointmentsQ = useQuery({
        queryKey: ["patientAppointments", patientId],
        queryFn: () => getAppointmentsByPatient(patientId),
        enabled: !!patientId,
    });
    const reportsQ = useQuery({
        queryKey: ["patientReports", patientId],
        queryFn: () => getReportsByPatientId(patientId),
        enabled: !!patientId,
    });
    const prescriptionsQ = useQuery({
        queryKey: ["patientPrescriptions", patientId],
        queryFn: () => getPrescriptionsByPatientId(patientId),
        enabled: !!patientId,
    });

    const visits = useMemo(() => {
        const reportsByAppointment: Record<string, any> = {};
        (reportsQ.data || []).forEach((r: any) => { reportsByAppointment[r.appointmentId] = r; });
        const rxByAppointment: Record<string, any> = {};
        (prescriptionsQ.data || []).forEach((p: any) => { rxByAppointment[p.appointmentId] = p; });
        return [...(appointmentsQ.data || [])]
            .sort((a: any, b: any) => new Date(b.appointmentTime).getTime() - new Date(a.appointmentTime).getTime())
            .map((a: any) => ({ ...a, report: reportsByAppointment[a.id], prescription: rxByAppointment[a.id] }));
    }, [appointmentsQ.data, reportsQ.data, prescriptionsQ.data]);

    if (!patientId) {
        return <div className="text-center text-gray-500 py-10">Loading patient…</div>;
    }

    const profile: any = profileQ.data || {};
    const allergies = parseList(profile.allergies);
    const chronic = parseList(profile.chronicDesease);
    const age = ageFromDob(profile.dob);
    const completed = visits.filter((v) => v.status === "COMPLETED").length;
    const loading = profileQ.isLoading || appointmentsQ.isLoading || reportsQ.isLoading || prescriptionsQ.isLoading;
    const anyError = profileQ.isError || appointmentsQ.isError || reportsQ.isError || prescriptionsQ.isError;

    return (
        <div className="flex flex-col gap-4">
            <Card withBorder radius="md" padding="md">
                <Group justify="space-between" mb="sm">
                    <Text fw={600}>Patient summary</Text>
                    {profileQ.isFetching && <Loader size="xs" />}
                </Group>
                <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                    <Info label="Name">{profile.name || appointment.patientName || "—"}</Info>
                    <Info label="Age / Gender">{age !== null ? `${age} yrs` : "—"}{profile.gender ? ` · ${profile.gender}` : ""}</Info>
                    <Info label="Date of birth">{formatDate(profile.dob) || "—"}</Info>
                    <Info label="Blood group">{bloodGroup[profile.bloodGroup] || "—"}</Info>
                    <Info label="Allergies">
                        {allergies.length ? <Group gap={4}>{allergies.map((a) => <Badge key={a} color="red" variant="light">{a}</Badge>)}</Group> : "None recorded"}
                    </Info>
                    <Info label="Chronic conditions">
                        {chronic.length ? <Group gap={4}>{chronic.map((c) => <Badge key={c} color="orange" variant="light">{c}</Badge>)}</Group> : "None recorded"}
                    </Info>
                    <Info label="Visits">{visits.length} total · {completed} completed</Info>
                    <Info label="Prescriptions">{(prescriptionsQ.data || []).length}</Info>
                </SimpleGrid>
            </Card>

            {anyError && (
                <Text c="red" size="sm">Some history could not be loaded. The data shown may be incomplete.</Text>
            )}

            <Card withBorder radius="md" padding="md">
                <Text fw={600} mb="sm">Visit history</Text>
                {loading && <Loader size="sm" />}
                {!loading && visits.length === 0 && (
                    <Text size="sm" c="dimmed">No previous appointments for this patient.</Text>
                )}
                {!loading && visits.length > 0 && (
                    <Timeline bulletSize={26} lineWidth={2}>
                        {visits.map((v: any) => (
                            <Timeline.Item
                                key={v.id}
                                bullet={v.report ? <IconClipboardHeart size={14} /> : <IconCalendarEvent size={14} />}
                                color={statusColor[v.status] || "blue"}
                                title={
                                    <Group gap="xs">
                                        <Text size="sm" fw={600}
                                            className={v.id !== appointment.id ? "cursor-pointer hover:underline" : ""}
                                            onClick={() => v.id !== appointment.id && navigate("/doctor/appointments/" + v.id)}>
                                            {formatDateWithtime(v.appointmentTime)}
                                        </Text>
                                        <Badge size="xs" variant="light" color={statusColor[v.status] || "blue"}>{v.status}</Badge>
                                        {v.id === appointment.id && <Badge size="xs" variant="outline">This visit</Badge>}
                                    </Group>
                                }
                            >
                                <Text size="xs" c="dimmed">Dr. {v.doctorName} · {v.reason || "No reason given"}</Text>
                                {v.report && (
                                    <div className="mt-1 text-sm">
                                        <div><b>Diagnosis:</b> {v.report.diagnosis || "—"}</div>
                                        {v.report.symptoms?.length > 0 && <div><b>Symptoms:</b> {v.report.symptoms.join(", ")}</div>}
                                        {v.report.tests?.length > 0 && <div><b>Tests:</b> {v.report.tests.join(", ")}</div>}
                                        {v.report.referral && <div><b>Referral:</b> {v.report.referral}</div>}
                                        {v.report.followUpDate && <div><b>Follow-up:</b> {formatDate(v.report.followUpDate)}</div>}
                                        {v.report.notes && <div className="text-gray-600">{v.report.notes}</div>}
                                    </div>
                                )}
                                {v.prescription?.medicines?.length > 0 && (
                                    <Group gap={4} mt={4}>
                                        <IconPill size={14} />
                                        {v.prescription.medicines.map((m: any, i: number) => (
                                            <Badge key={m.id ?? i} size="sm" variant="dot">
                                                {m.name} {m.dosage} · {m.frequency} · {m.duration}d
                                            </Badge>
                                        ))}
                                    </Group>
                                )}
                            </Timeline.Item>
                        ))}
                    </Timeline>
                )}
            </Card>
        </div>
    );
};

export default MedicalHistory;
