import { useMemo } from "react";
import { Badge, Button, Group, Loader, ScrollArea, SimpleGrid, Text } from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { getBookedSlots } from "../../../Service/AppointmentService";

/**
 * 15-minute slot picker.
 *
 * Business rule (enforced by AppointmentMS, mirrored here for UX): a doctor cannot have two
 * active appointments whose start times are less than SLOT_MINUTES apart. Slots that clash with
 * an existing SCHEDULED/COMPLETED appointment are shown disabled; past slots are hidden.
 *
 * value / onChange use the backend LocalDateTime format: "YYYY-MM-DDTHH:mm:ss".
 */
export const SLOT_MINUTES = 15;
const SLOT_FORMAT = "YYYY-MM-DDTHH:mm:ss";

const PARTS_OF_DAY = [
    { label: "Night", from: 0, to: 6 },
    { label: "Morning", from: 6, to: 12 },
    { label: "Afternoon", from: 12, to: 17 },
    { label: "Evening", from: 17, to: 24 },
];

interface SlotPickerProps {
    doctorId?: string | number | null;
    date: string | null;
    onDateChange: (date: string | null) => void;
    value: string;
    onChange: (value: string) => void;
    error?: React.ReactNode;
}

const SlotPicker = ({ doctorId, date, onDateChange, value, onChange, error }: SlotPickerProps) => {
    const hasDoctor = doctorId !== undefined && doctorId !== null && doctorId !== "";

    const { data: booked = [], isFetching, isError } = useQuery({
        queryKey: ["bookedSlots", String(doctorId ?? ""), date],
        queryFn: () => getBookedSlots(doctorId, date as string),
        enabled: hasDoctor && !!date,
        staleTime: 15_000,
    });

    const slots = useMemo(() => {
        if (!date) return [];
        const day = dayjs(date).startOf("day");
        const now = dayjs();
        const bookedTimes = (booked as string[]).map((t) => dayjs(t));
        const result: { value: string; label: string; hour: number; blocked: boolean }[] = [];
        for (let minute = 0; minute < 24 * 60; minute += SLOT_MINUTES) {
            const slot = day.add(minute, "minute");
            if (!slot.isAfter(now)) continue; // cannot book in the past
            const blocked = bookedTimes.some(
                (t) => Math.abs(t.diff(slot, "minute", true)) < SLOT_MINUTES
            );
            result.push({ value: slot.format(SLOT_FORMAT), label: slot.format("hh:mm A"), hour: slot.hour(), blocked });
        }
        return result;
    }, [date, booked]);

    const availableCount = slots.filter((s) => !s.blocked).length;

    return (
        <div className="flex flex-col gap-2">
            <DatePickerInput
                label="Appointment Date"
                placeholder="Pick a date"
                withAsterisk
                minDate={dayjs().format("YYYY-MM-DD")}
                value={date}
                onChange={(d: any) => {
                    onDateChange(d ? dayjs(d).format("YYYY-MM-DD") : null);
                    onChange("");
                }}
            />

            <div>
                <Group justify="space-between" mb={4}>
                    <Text size="sm" fw={500}>
                        Time Slot <span className="text-red-500">*</span>
                        <Text span size="xs" c="dimmed"> ({SLOT_MINUTES}-minute slots)</Text>
                    </Text>
                    {hasDoctor && date && (
                        isFetching ? <Loader size="xs" /> :
                            <Badge variant="light" color={availableCount ? "teal" : "red"}>
                                {availableCount} available
                            </Badge>
                    )}
                </Group>

                {!hasDoctor && <Text size="sm" c="dimmed">Select a doctor first.</Text>}
                {hasDoctor && !date && <Text size="sm" c="dimmed">Pick a date to see free slots.</Text>}
                {hasDoctor && date && isError && (
                    <Text size="sm" c="red">Could not load the doctor's booked slots. Please try again.</Text>
                )}
                {hasDoctor && date && !isError && slots.length === 0 && (
                    <Text size="sm" c="dimmed">No more slots left on this date.</Text>
                )}

                {hasDoctor && date && !isError && slots.length > 0 && (
                    <ScrollArea.Autosize mah={260} type="auto" offsetScrollbars>
                        {PARTS_OF_DAY.map((part) => {
                            const partSlots = slots.filter((s) => s.hour >= part.from && s.hour < part.to);
                            if (partSlots.length === 0) return null;
                            return (
                                <div key={part.label} className="mb-2">
                                    <Text size="xs" c="dimmed" mb={4}>{part.label}</Text>
                                    <SimpleGrid cols={{ base: 3, sm: 5 }} spacing={6} verticalSpacing={6}>
                                        {partSlots.map((slot) => (
                                            <Button
                                                key={slot.value}
                                                size="compact-sm"
                                                variant={value === slot.value ? "filled" : slot.blocked ? "light" : "outline"}
                                                color={slot.blocked ? "gray" : "teal"}
                                                disabled={slot.blocked}
                                                title={slot.blocked ? "Doctor already has an appointment within 15 minutes" : undefined}
                                                onClick={() => onChange(slot.value)}
                                            >
                                                {slot.label}
                                            </Button>
                                        ))}
                                    </SimpleGrid>
                                </div>
                            );
                        })}
                    </ScrollArea.Autosize>
                )}
                {error && <Text size="xs" c="red" mt={4}>{error}</Text>}
            </div>
        </div>
    );
};

export default SlotPicker;
