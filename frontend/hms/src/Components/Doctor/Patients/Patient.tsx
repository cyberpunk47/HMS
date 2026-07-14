import { useState } from "react";
import { getPatientsDetailsByIds } from "../../../Service/PatientProfileService";
import { getPatientIdsByDoctor } from "../../../Service/AppointmentService";
import PatientCard from "./PatientCard";
import { useQuery } from "@tanstack/react-query";
import { Select, TextInput, Group, ActionIcon } from "@mantine/core";
import { IconSearch, IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import { Paginator } from "primereact/paginator";
import { useSelector } from "react-redux";

const Patient = () => {
  const user = useSelector((state: any) => state.user);

  const { data: patients = [], isLoading, isError } = useQuery({
    queryKey: ["doctorPatients", user?.profileId],
    queryFn: async () => {
      if (!user?.profileId) return [];
      const ids = await getPatientIdsByDoctor(user.profileId);
      if (!ids || ids.length === 0) return [];
      return getPatientsDetailsByIds(ids);
    },
    enabled: !!user?.profileId,
  });

  const total = patients.length;
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filter
  const filteredPatients = patients.filter((patient: any) =>
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Paginate
  const paginatedPatients = sortedPatients.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  );

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setCurrentPage(0);
  };

  const handleSortFieldChange = (value: string | null) => {
    if (value) {
      setSortField(value);
      setCurrentPage(0);
    }
  };

  if (isLoading) return <div className="p-5 text-gray-500">Loading patients...</div>;
  if (isError) return <div className="p-5 text-red-500">Failed to load patients.</div>;

  return (
    <div>
      <div className="text-xl text-primary-500 font-semibold mb-5">Patients</div>

      {/* Search + Sort Controls */}
      <Group className="mb-4" align="center">
        <TextInput
          leftSection={<IconSearch />}
          placeholder={`Search Patients from ${total}`}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(0);
          }}
          style={{ flex: 1 }}
        />

        <Select
          placeholder="Sort By"
          value={sortField}
          onChange={handleSortFieldChange}
          data={[
            { value: "name", label: "Name" },
          ]}
        />

        <ActionIcon onClick={toggleSortOrder} variant="light" size="lg">
          {sortOrder === "asc" ? <IconArrowUp size={20} /> : <IconArrowDown size={20} />}
        </ActionIcon>
      </Group>

      {/* Card Grid */}
      <div className="grid grid-cols-4 gap-5">
        {paginatedPatients.map((patient: any) => (
          <PatientCard key={patient.id} {...patient} />
        ))}
      </div>

      {/* Paginator */}
      <Paginator
        first={currentPage * rowsPerPage}
        rows={rowsPerPage}
        totalRecords={sortedPatients.length}
        onPageChange={(e) => {
          setCurrentPage(e.page);
          setRowsPerPage(e.rows);
        }}
        rowsPerPageOptions={[4, 8, 12, 20]}
        className="mt-4"
      />
    </div>
  );
};

export default Patient;