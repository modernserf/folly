import { lens, lensPath, view, over, set, add, pipe, compose, append, when } from 'ramda'

const lensInto = (treeLens, pathLens) => {
    const getAtCursor = compose(lensPath, view(pathLens))
    return lens(
        (state) => view(compose(treeLens, getAtCursor(state)), state),
        (value, state) => set(compose(treeLens, getAtCursor(state)), value, state)
    )
}

const blankFactLine = ['']

const cursorY = lensPath(['selectionPath', 0])
const cursorX = lensPath(['selectionPath', 1])
const cursorPath = lensPath(['selectionPath'])
const lines = lensPath(['lines'])

const atCursor = lensInto(lines, cursorPath)

const selectNextLine = pipe(
    over(cursorY, add(1)),
    set(cursorX, 0))
const selectNextToken = over(cursorX, add(1))

const insertBlankTerm = (state) => {
    const y = view(cursorY, state)
    const line = compose(lines, lensPath([y]))
    return over(line, append(''), state)
}
const insertSpaceLine = over(lines, append([]))
const insertNewLine = over(lines, append(blankFactLine))

const copyLineAbove = (state) => {
    let aboveState = over(cursorY, add(-1), state)
    state = set(atCursor, view(atCursor, aboveState), state)
    aboveState = selectNextToken(aboveState)
    while (hasNextToken(aboveState)) {
        aboveState = selectNextToken(aboveState)
        state = insertBlankTerm(state)
    }
    return state
}

const match = (handlers, initState) => (state = initState, action) => handlers[action.type]
    ? pipe(...handlers[action.type](action.payload))(state)
    : state

const hasNextToken = (state) => {
    const withNextToken = selectNextToken(state)
    return view(atCursor, withNextToken) !== undefined
}

export const reducer = match({
    key_down: (ch) => [over(atCursor, (w) => w + ch)],
    add_term: () => [insertBlankTerm, selectNextToken],
    new_line: () => [insertSpaceLine, selectNextLine, insertNewLine, selectNextLine],
    new_line_dup: () => [
        insertNewLine,
        selectNextLine,
        copyLineAbove,
        insertBlankTerm,
        selectNextToken,
    ],
    insert_value: (value) => [
        set(atCursor, value),
        when(hasNextToken, selectNextToken),
    ],
}, {
    lines: [blankFactLine],
    selectionPath: [0, 0],
})
