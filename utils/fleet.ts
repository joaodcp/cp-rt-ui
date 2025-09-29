export function getFormattedFleetNumber(fleetNumber: string) {
    // 111111 to 111-111 (UTD 592)
    if (fleetNumber.length === 6 && fleetNumber.startsWith("592"))
        return `${fleetNumber.slice(0, 3)}-${fleetNumber.slice(3)}`;

    return fleetNumber;
}
