const arrayToCSV = (arr: string[]) => {
    console.log(arr);
    if(!arr || arr.length === 0) return null;
    return arr.join(", ");
}

export { arrayToCSV };
