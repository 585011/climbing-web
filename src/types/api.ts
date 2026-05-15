export interface ClimbingAreas {
    id: number;
    name: string;
    description: string;
    latitude: number;
    longitude: number;
    region: string;
    created_at: Date;
}

export interface Walls {
    id: number;
    area_id: number;
    name: string;
    description: string;
    latitude: string;
    longitude: string;
    approach_info: string;
    created_at: Date;
}

export interface Routes {
    id: number;
    wall_id: number;
    name: string;
    grade: string;
    length: string;
    style: string;
    bolts: number;
    rope_lengths: number;
    first_ascendant: string;
    description: string;
    created_at: Date;
}