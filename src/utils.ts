export function parseQuotedArgumentsBackwards(str: string, numStrings: number): string[] {
    const words: string[] = [];
    str = str.split('').reverse().join('');
    let i = 0;
    let currentWord = "";
    let inQuote = false;
    while (words.length < numStrings && i < str.length) {
        const char = str[i];
        if (char === '"') {
            if (inQuote) {
                words.push(currentWord);
                inQuote = false;
                currentWord = "";
            } else {
                currentWord = "";
                inQuote = true;
            }
        } else if (char === ' ' && !inQuote) {
            if (currentWord.length > 0) words.push(currentWord);
            currentWord = "";
        } else {
            currentWord += char;
        }
        i++;
    }
    if (currentWord.length > 0) words.push(currentWord);
    if (i < str.length) words.push(str.substring(i));

    const fixed: string[] = [];
    for (const word of words) {
        fixed.push(word.split('').reverse().join('').trim());
    }

    return fixed;
}