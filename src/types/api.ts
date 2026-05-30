export interface ClimbingArea {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  region: string;
  createdAt: string;
}

export interface Wall {
  id: number;
  areaId: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  approachInfo: string;
  createdAt: string;
}

export interface ClimbingRoute {
  id: number;
  wallId: number;
  name: string;
  grade: string;
  length: number;
  style: string;
  bolts: number;
  ropeLengths: number;
  firstAscendant: string;
  description: string;
  createdAt: string;
}