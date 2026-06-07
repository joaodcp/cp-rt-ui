export function getFormattedFleetNumber(fleetNumber: string, agencyId: string = 'CP') {
    // 111111 to 111-111 (UTD 592)
    if (fleetNumber.length === 6 && fleetNumber.startsWith("592"))
        return `${fleetNumber.slice(0, 3)}-${fleetNumber.slice(3)}`;

    if (agencyId === "FT")
        return `UQE ${fleetNumber}`;

    return fleetNumber;
}
