import { lens, lensPath, view, over, set, add, pipe, compose, append } from 'ramda'

const lensInto = (treeLens, pathLens) => {
    const getAtCursor = compose(lensPath, view(pathLens))
    return lens(
        (state) => view(compose(treeLens, getAtCursor(state)), state),
        (value, state) => set(compose(treeLens, getAtCursor(state)), value, state)
    )
}

const blankFactLine = ['', '']

const cursorY = lensPath(['selectionPath', 0])
const cursorX = lensPath(['selectionPath', 1])
const cursorPath = lensPath(['selectionPath'])
const lines = lensPath(['lines'])

const atCursor = lensInto(lines, cursorPath)

const selectNextLine = pipe(
    over(cursorY, add(1)),
    set(cursorX, 0))
const selectNextToken = over(cursorX, add(1))

const insertNewLine = over(lines, append(blankFactLine))

const copyTokenAbove = (state) => {
    const ifLineWereAbove = over(cursorY, add(-1), state)
    return set(atCursor, view(atCursor, ifLineWereAbove), state)
}

const match = (map, initState) => (state = initState, action) => map[action.type]
    ? map[action.type](state, action.payload, action)
    : state

export const reducer = match({
    key_down: (state, ch) => over(atCursor, (w) => w + ch, state),
    next_focus: selectNextToken,
    new_line_dup: pipe(insertNewLine, selectNextLine, copyTokenAbove, selectNextToken),
}, {
    lines: [blankFactLine],
    selectionPath: [0, 0],
})
