const formatDate = (dateString: any) => {
    if (!dateString) return undefined;
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const date = new Date(dateString)
    const day = date.getDate();
    const month = months[date.getMonth()]
    const year = date.getFullYear()

    return `${day} ${month} ${year}`
}


const formatDateWithtimeUtil = (dateString: any) => {
    if (!dateString) return undefined;

    const date = new Date(dateString);

    const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
    };

    return date.toLocaleString("en-US", options);
};
const parseDateAsUTC = (dateString: string) => {
    if (!dateString) return null;

    // Backend already provides timezone information
    if (/[zZ]|[+-]\d{2}:\d{2}$/.test(dateString)) {
        return new Date(dateString);
    }

    // Backend sends timezone-less timestamps in UTC
    return new Date(`${dateString}Z`);
};
const extractTimeIn12HourFormat = (dateString: any) => {
    if (!dateString) return undefined

    const date = new Date(dateString);

    const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
    };

    return date.toLocaleTimeString("en-US", options)
}

const formatDateWithtime = formatDateWithtimeUtil;

export {
    parseDateAsUTC,
    formatDate,
    formatDateWithtime,
    formatDateWithtimeUtil,
    extractTimeIn12HourFormat
};