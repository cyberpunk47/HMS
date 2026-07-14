import { useState } from "react";
import { getAllDoctors } from "../../../Service/DoctorProfileService";
import DoctorCard from "./DoctorCard";
import { useQuery } from "@tanstack/react-query";
import { TextInput, Select, ActionIcon, Group } from "@mantine/core";
import { IconSearch, IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import { Paginator } from "primereact/paginator";

const Doctor = () => {
  const { data: doctors = [], isLoading, isError } = useQuery({
    queryKey: ["doctors"],
    queryFn: getAllDoctors,
  });
  const total = doctors.length;

  // Pagination & filtering state
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(8);
  const [searchTerm, setSearchTerm] = useState("");

  // Sorting state
  const [sortField, setSortField] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Filter doctors by search term (case‑insensitive)
  const filteredDoctors = doctors.filter((doctor: any) =>
    doctor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doctor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort the filtered list
  const sortedDoctors = [...filteredDoctors].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    // Handle numbers or strings
    if (typeof aVal === "string") aVal = aVal.toLowerCase();
    if (typeof bVal === "string") bVal = bVal.toLowerCase();

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Paginate the sorted list
  const paginatedDoctors = sortedDoctors.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  );

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setCurrentPage(0); // reset to first page
  };

  // Change sort field
  const handleSortFieldChange = (value: string | null) => {
    if (value) {
      setSortField(value);
      setCurrentPage(0);
    }
  };

  if (isLoading) return <div className="p-5 text-gray-500">Loading doctors...</div>;
  if (isError) return <div className="p-5 text-red-500">Failed to load doctors.</div>;

  return (
    <div>
      <div className="text-xl text-primary-500 font-semibold mb-5">Doctors</div>

      {/* Search + Sort Controls */}
      <Group className="mb-4" align="center">
        <TextInput
          leftSection={<IconSearch />}
          placeholder={`Search Doctors from ${total}`}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(0);
          }}
          style={{ flex: 1 }}
        />

        <Select
          placeholder="Sort by"
          value={sortField}
          onChange={handleSortFieldChange}
          data={[
            { value: "name", label: "Name" },
            { value: "specialization", label: "Specialty" },
            { value: "totalExp", label: "Experience" },
            // Add more fields that exist in your doctor object
          ]}
          style={{ width: 150 }}
        />

        <ActionIcon onClick={toggleSortOrder} variant="light" size="lg">
          {sortOrder === "asc" ? <IconArrowUp size={20} /> : <IconArrowDown size={20} />}
        </ActionIcon>
      </Group>

      {/* Card Grid */}
      <div className="grid grid-cols-4 gap-5">
        {paginatedDoctors.map((doctor: any) => (
          <DoctorCard key={doctor.id} {...doctor} />
        ))}
      </div>

      {/* Paginator */}
      <Paginator
        first={currentPage * rowsPerPage}
        rows={rowsPerPage}
        totalRecords={sortedDoctors.length}
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

export default Doctor;