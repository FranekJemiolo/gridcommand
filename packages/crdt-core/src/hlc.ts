/**
 * Hybrid Logical Clock (HLC) Implementation
 * Follows Kulkarni et al. formulation for strict causality and physical correspondence.
 * Key Format: YYYY-MM-DDTHH:mm:ss.sssZ-CCCC-dddddddd
 */

export class HLC {
  private lastPhysical: number = 0;
  private logical: number = 0;
  private deviceId: string;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public now(): string {
    const phys = Date.now();
    if (phys > this.lastPhysical) {
      this.lastPhysical = phys;
      this.logical = 0;
    } else {
      this.logical++;
    }
    const iso = new Date(this.lastPhysical).toISOString();
    const count = this.logical.toString().padStart(4, '0');
    return `${iso}-${count}-${this.deviceId}`;
  }

  public update(incomingHLC: string): void {
    const parsed = HLC.parse(incomingHLC);
    if (!parsed) return;

    const { physical: incomingPhys, logical: incomingLogical } = parsed;
    const localPhys = Date.now();

    const maxPhys = Math.max(this.lastPhysical, localPhys, incomingPhys);
    if (maxPhys === this.lastPhysical && maxPhys === incomingPhys) {
      this.logical = Math.max(this.logical, incomingLogical) + 1;
    } else if (maxPhys === incomingPhys) {
      this.logical = incomingLogical + 1;
      this.lastPhysical = incomingPhys;
    } else if (maxPhys === localPhys && maxPhys === this.lastPhysical) {
      this.logical = this.logical + 1;
    } else {
      this.lastPhysical = maxPhys;
      this.logical = 0;
    }
  }

  public static parse(hlcString: string): { physical: number; logical: number; deviceId: string } | null {
    const lastDash = hlcString.lastIndexOf('-');
    if (lastDash === -1) return null;
    const secondLastDash = hlcString.lastIndexOf('-', lastDash - 1);
    if (secondLastDash === -1) return null;

    const isoStr = hlcString.substring(0, secondLastDash);
    const countStr = hlcString.substring(secondLastDash + 1, lastDash);
    const deviceId = hlcString.substring(lastDash + 1);

    const physical = new Date(isoStr).getTime();
    if (isNaN(physical)) return null;

    const logical = parseInt(countStr, 10);
    if (isNaN(logical)) return null;

    return { physical, logical, deviceId };
  }

  public static compare(a: string, b: string): number {
    return a.localeCompare(b);
  }
}
