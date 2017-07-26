interface Config {
    itemList: string[],
    goals: { [key: string]: number };
    moves: number,
    spawnLine: number[];
    field: Array<Array<number | string>>;
    f2: (number | string)[][];
}