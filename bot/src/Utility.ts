export function random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export function distance(ax: number, az: number, bx: number, bz: number): number {
    const dx = ax - bx;
    const dz = az - bz;
    return Math.sqrt(dx * dx + dz * dz);
}
