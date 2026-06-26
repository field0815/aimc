import type { DataAdapter } from "./types";
import { fmpAdapter } from "./fmp";
import { fredAdapter } from "./fred";
import { opendartAdapter } from "./opendart";

// 등록된 모든 어댑터. 새 소스를 추가하려면 여기에 push 하세요.
export const ADAPTERS: DataAdapter[] = [fmpAdapter, fredAdapter, opendartAdapter];

export { fmpAdapter, fredAdapter, opendartAdapter };
export * from "./types";
