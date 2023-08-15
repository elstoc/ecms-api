interface HasWeightTitle {
    weight?: number;
    title?: string;
}

export const sortByWeightAndTitle = <T extends HasWeightTitle>(input: T[]): T[] => {
    return input.sort((a, b) => {
        if (a.weight && !b.weight) return -1;
        if (b.weight && !a.weight) return 1;
        if (a.weight && b.weight) return a.weight - b.weight;
        if (a.title === b.title) return 0;
        if (!a.title || !b.title) return 0;
        if (a.title > b.title) return 1;
        return -1;
    });
};
