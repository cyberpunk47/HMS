import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import {
    ActionIcon, Badge, Card, Divider, Group, Loader, Modal, SegmentedControl, Select, SimpleGrid, Stack,
    Text, TextInput, Tooltip,
} from "@mantine/core";
import { IconArrowDown, IconArrowUp, IconEye, IconRefresh, IconSearch } from "@tabler/icons-react";
import dayjs from "dayjs";
import {
    getAllAppointmentsAdmin, getAppointmentStatusCounts, getReportDetailsByAppointmentId,
} from "../../../Service/AppointmentService";
import { getDoctorDropdown } from "../../../Service/DoctorProfileService";
import { formatDate, formatDateWithtime } from "../../../Utility/DateUtility";
import { bloodGroup } from "../../../data/DropdownData";

const STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "EXPIRED"] as const;
const RANGES = ["Upcoming", "Today", "Past", "All"] as const;
type Range = (typeof RANGES)[number];

const statusSeverity = (status: string) => {
    switch (status) {
        case "SCHEDULED": return "info";
        case "COMPLETED": return "success";
        case "CANCELLED": return "danger";
        case "EXPIRED": return "secondary";
        default: return null;
    }
};

const LDT = "YYYY-MM-DDTHH:mm:ss";

// Translate the range tab into the backend's from/to filter (wall-clock LocalDateTime strings).
const rangeToFilter = (range: Range) => {
    const now = dayjs();
    switch (range) {
        case "Upcoming": return { from: now.format(LDT), to: undefined, sort: "asc" };
        case "Today": return { from: now.startOf("day").format(LDT), to: now.add(1, "day").startOf("day").format(LDT), sort: "asc" };
        case "Past": return { from: undefined, to: now.format(LDT), sort: "desc" };
        default: return { from: undefined, to: undefined, sort: "desc" };
    }
};

const Field = ({ label, value }: { label: string; value: any }) => (
    // minWidth: 0 is the important half. A CSS grid item defaults to
    // min-width: auto, which refuses to shrink below the width of its content,
    // so a long value pushes the cell wider than its column and runs over the
    // neighbouring one. overflowWrap: anywhere is the other half: an email or a
    // phone number contains no spaces, so without it the browser has no legal
    // place to break the line. Both are needed - either alone still overlaps.
    <div style={{ minWidth: 0 }}>
        <Text size="xs" c="dimmed">{label}</Text>
        <Text size="sm" style={{ overflowWrap: "anywhere" }}>
            {value === undefined || value === null || value === "" ? "—" : value}
        </Text>
    </div>
);

const AppointmentDetailModal = ({ appointment, onClose }: { appointment: any; onClose: () => void }) => {
    const { data: report, isFetching } = useQuery({
        queryKey: ["adminAppointmentReport", appointment?.id],
        queryFn: () => getReportDetailsByAppointmentId(appointment.id),
        enabled: !!appointment?.id && !!appointment?.reportAvailable,
        retry: false,
    });

    return (
        <Modal opened={!!appointment} onClose={onClose} size="xl" centered
            title={<Text fw={600} size="lg">Appointment #{appointment?.id}</Text>}>
            {appointment && (
                <Stack gap="md">
                    <Group justify="space-between">
                        <Text fw={500}>{formatDateWithtime(appointment.appointmentTime)}</Text>
                        <Tag value={appointment.status} severity={statusSeverity(appointment.status) as any} />
                    </Group>
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        <Card withBorder radius="md">
                            <Text fw={600} mb="xs">Patient</Text>
                            <SimpleGrid cols={2} spacing="xs">
                                <Field label="Name" value={appointment.patientName} />
                                <Field label="Patient ID" value={appointment.patientId} />
                                <Field label="Email" value={appointment.patientEmail} />
                                <Field label="Phone" value={appointment.patientPhone} />
                                <Field label="Gender" value={appointment.patientGender} />
                                <Field label="Blood group" value={bloodGroup[appointment.patientBloodGroup] ?? appointment.patientBloodGroup} />
                            </SimpleGrid>
                        </Card>
                        <Card withBorder radius="md">
                            <Text fw={600} mb="xs">Doctor</Text>
                            <SimpleGrid cols={2} spacing="xs">
                                <Field label="Name" value={appointment.doctorName ? `Dr. ${appointment.doctorName}` : undefined} />
                                <Field label="Doctor ID" value={appointment.doctorId} />
                                <Field label="Specialization" value={appointment.doctorSpecialization} />
                                <Field label="Department" value={appointment.doctorDepartment} />
                                <Field label="Email" value={appointment.doctorEmail} />
                                <Field label="Phone" value={appointment.doctorPhone} />
                            </SimpleGrid>
                        </Card>
                    </SimpleGrid>
                    <Card withBorder radius="md">
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                            <Field label="Reason" value={appointment.reason} />
                            <Field label="Notes" value={appointment.notes} />
                            <Field label="Report" value={appointment.reportAvailable ? "Available" : "Not created"} />
                            <Field label="Prescription" value={appointment.prescriptionId ? `#${appointment.prescriptionId}` : "None"} />
                        </SimpleGrid>
                    </Card>

                    {appointment.reportAvailable && (
                        <Card withBorder radius="md">
                            <Text fw={600} mb="xs">Report</Text>
                            {isFetching && <Loader size="sm" />}
                            {report && (
                                <Stack gap="xs">
                                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                                        <Field label="Diagnosis" value={report.diagnosis} />
                                        <Field label="Referral" value={report.referral} />
                                        <Field label="Created" value={formatDate(report.createdAt)} />
                                        <Field label="Follow-up" value={formatDate(report.followUpDate)} />
                                    </SimpleGrid>
                                    <Field label="Symptoms" value={(report.symptoms || []).join(", ")} />
                                    <Field label="Tests" value={(report.tests || []).join(", ")} />
                                    <Field label="Notes" value={report.notes} />
                                    {report.prescription?.medicines?.length > 0 && (
                                        <>
                                            <Divider label="Prescribed medicines" labelPosition="left" />
                                            {report.prescription.medicines.map((m: any, i: number) => (
                                                <Text size="sm" key={m.id ?? i}>
                                                    <b>{m.name}</b> {m.dosage} · {m.frequency} · {m.duration} days
                                                    {m.instructions ? ` · ${m.instructions}` : ""}
                                                </Text>
                                            ))}
                                        </>
                                    )}
                                </Stack>
                            )}
                        </Card>
                    )}
                </Stack>
            )}
        </Modal>
    );
};

const Appointments = () => {
    const [range, setRange] = useState<Range>("Upcoming");
    const [status, setStatus] = useState<string | null>(null);
    const [doctorId, setDoctorId] = useState<string | null>(null);
    const [sortAsc, setSortAsc] = useState<boolean | null>(null);
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(20);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<any>(null);

    const rangeFilter = rangeToFilter(range);
    const sort = sortAsc === null ? rangeFilter.sort : sortAsc ? "asc" : "desc";
    const params = {
        page: Math.floor(first / rows),
        size: rows,
        status: status || undefined,
        doctorId: doctorId || undefined,
        from: rangeFilter.from,
        to: rangeFilter.to,
        sort,
    };

    const { data, isFetching, isError, refetch } = useQuery({
        // "from/to" change every render for Upcoming/Past, so key on the range name instead.
        queryKey: ["adminAppointments", range, status, doctorId, sort, first, rows],
        queryFn: () => getAllAppointmentsAdmin(params),
        placeholderData: keepPreviousData,
    });

    const { data: statusCounts = [] } = useQuery({
        queryKey: ["adminAppointmentStatusCounts"],
        queryFn: getAppointmentStatusCounts,
    });

    const { data: doctors = [] } = useQuery({
        queryKey: ["doctorDropdown"],
        queryFn: getDoctorDropdown,
        select: (list: any[]) => list.map((d: any) => ({ value: String(d.id), label: d.name })),
    });

    const counts = useMemo(() => {
        const map: Record<string, number> = {};
        (statusCounts as any[]).forEach((c) => { map[c.status] = c.count; });
        return map;
    }, [statusCounts]);
    const totalAll = Object.values(counts).reduce((a, b) => a + b, 0);

    const rowsData = useMemo(() => {
        const content = data?.content ?? [];
        const q = search.trim().toLowerCase();
        if (!q) return content;
        return content.filter((a: any) =>
            [a.patientName, a.patientEmail, a.patientPhone, a.doctorName, a.doctorSpecialization, a.reason, a.notes, String(a.id)]
                .some((v) => v && String(v).toLowerCase().includes(q))
        );
    }, [data, search]);

    const resetPage = () => setFirst(0);

    return (
        <div className="flex flex-col gap-4">
            <Group justify="space-between">
                <Text className="text-xl text-primary-500 font-semibold">Appointments</Text>
                <Tooltip label="Refresh">
                    <ActionIcon variant="light" onClick={() => refetch()}><IconRefresh size={18} /></ActionIcon>
                </Tooltip>
            </Group>

            <SimpleGrid cols={{ base: 2, sm: 5 }}>
                <Card withBorder radius="md" padding="sm">
                    <Text size="xs" c="dimmed">All appointments</Text>
                    <Text fw={700} size="xl">{totalAll}</Text>
                </Card>
                {STATUSES.map((s) => (
                    <Card key={s} withBorder radius="md" padding="sm">
                        <Text size="xs" c="dimmed">{s.charAt(0) + s.slice(1).toLowerCase()}</Text>
                        <Text fw={700} size="xl">{counts[s] ?? 0}</Text>
                    </Card>
                ))}
            </SimpleGrid>

            <Group gap="sm" wrap="wrap">
                <SegmentedControl value={range} data={[...RANGES]}
                    onChange={(v) => { setRange(v as Range); setSortAsc(null); resetPage(); }} />
                <Select placeholder="Any status" clearable value={status} data={[...STATUSES]} w={160}
                    onChange={(v) => { setStatus(v); resetPage(); }} />
                <Select placeholder="Any doctor" clearable searchable value={doctorId} data={doctors} w={220}
                    onChange={(v) => { setDoctorId(v); resetPage(); }} />
                <Tooltip label={sort === "asc" ? "Oldest first" : "Newest first"}>
                    <ActionIcon variant="light" size="lg" onClick={() => { setSortAsc(sort !== "asc"); resetPage(); }}>
                        {sort === "asc" ? <IconArrowUp size={18} /> : <IconArrowDown size={18} />}
                    </ActionIcon>
                </Tooltip>
                <TextInput leftSection={<IconSearch size={16} />} placeholder="Search this page (patient, doctor, reason)"
                    value={search} onChange={(e) => setSearch(e.currentTarget.value)} style={{ flex: 1, minWidth: 220 }} />
            </Group>

            {isError && <Text c="red" size="sm">Failed to load appointments.</Text>}

            <DataTable
                value={rowsData}
                lazy
                paginator
                first={first}
                rows={rows}
                totalRecords={data?.totalElements ?? 0}
                onPage={(e) => { setFirst(e.first); setRows(e.rows); }}
                rowsPerPageOptions={[10, 20, 50, 100]}
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Showing {first} to {last} of {totalRecords} appointments"
                loading={isFetching}
                dataKey="id"
                stripedRows
                size="small"
                emptyMessage="No appointments found."
                onRowClick={(e) => setSelected(e.data)}
                rowHover
            >
                <Column field="id" header="#" style={{ width: "5rem" }} />
                <Column header="Date & Time" style={{ minWidth: "13rem" }}
                    body={(r) => formatDateWithtime(r.appointmentTime)} />
                <Column header="Patient" style={{ minWidth: "13rem" }} body={(r) => (
                    <div>
                        <div className="font-medium">{r.patientName}</div>
                        <div className="text-xs text-gray-500">{r.patientPhone || r.patientEmail || `ID ${r.patientId}`}</div>
                    </div>
                )} />
                <Column header="Doctor" style={{ minWidth: "13rem" }} body={(r) => (
                    <div>
                        <div className="font-medium">Dr. {r.doctorName}</div>
                        <div className="text-xs text-gray-500">{r.doctorSpecialization || r.doctorDepartment || `ID ${r.doctorId}`}</div>
                    </div>
                )} />
                <Column field="reason" header="Reason" style={{ minWidth: "12rem" }} />
                <Column header="Status" style={{ minWidth: "8rem" }}
                    body={(r) => <Tag value={r.status} severity={statusSeverity(r.status) as any} />} />
                <Column header="Records" style={{ minWidth: "10rem" }} body={(r) => (
                    <Group gap={4}>
                        {r.reportAvailable && <Badge size="xs" color="teal" variant="light">Report</Badge>}
                        {r.prescriptionId && <Badge size="xs" color="blue" variant="light">Rx</Badge>}
                        {!r.reportAvailable && !r.prescriptionId && <Text size="xs" c="dimmed">—</Text>}
                    </Group>
                )} />
                <Column header="" style={{ width: "4rem" }} body={(r) => (
                    <ActionIcon variant="subtle" onClick={(e) => { e.stopPropagation(); setSelected(r); }}>
                        <IconEye size={18} />
                    </ActionIcon>
                )} />
            </DataTable>

            <AppointmentDetailModal appointment={selected} onClose={() => setSelected(null)} />
        </div>
    );
};

export default Appointments;
