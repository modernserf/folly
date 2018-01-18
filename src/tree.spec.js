
const head = (xs) => xs[0]
const tail = (xs) => xs.slice(1)
const most = (xs) => xs.slice(0, -1)
const last = (xs) => xs[xs.length - 1]

const traverse = (data, path) =>
    path.length ? traverse(data[head(path)], tail(path)) : data

const findNextNode = (data, path, offset) => {
    if (!path.length) { return [] }
    const keys = Object.keys(traverse(data, most(path)))
    const idx = keys.indexOf(last(path))
    const nextKey = keys[idx + offset]
    if (nextKey) {
        return most(path).concat([nextKey])
    } else {
        return findNextNode(data, most(path), offset)
    }
}

const firstLeaf = (data, path, offset) => {
    const val = traverse(data, path)
    if (typeof val === 'object') {
        const keys = Object.keys(val)
        const nextKey = offset > 0 ? head(keys) : last(keys)
        return firstLeaf(data, path.concat([nextKey]), offset)
    } else {
        return path
    }
}

const findNextLeaf = (data, path, offset) => {
    const val = traverse(data, path)
    if (typeof val === 'object' && offset > 0) {
        return firstLeaf(data, path, offset)
    }
    const nextPath = findNextNode(data, path, offset)
    return firstLeaf(data, nextPath, offset)
}

const findNextUndefined = (data, path, offset) => {
    const inner = (innerPath) => {
        const leaf = findNextLeaf(data, innerPath, offset)
        if (traverse(data, leaf) === undefined) {
            return leaf
        }
        return inner(leaf)
    }

    try {
        return inner(path)
    } catch (e) {
        return path
    }
}
