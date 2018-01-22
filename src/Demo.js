import h from 'react-hyperscript'
import styled from 'styled-components'

export const Container = styled.div`
    width: 375px;
    height: 812px;
    border: 1px solid #ccc;
    border-radius: 20px;
    margin: 20px;
    padding: 20px;
    font-family: 'Parc Place', sans-serif;
    color: #333;
`

const Selected = styled.span`
    display: inline-block;
    padding-bottom: 2px;
    border-bottom: 2px solid green;
`

const Block = styled.div`
    margin-bottom: 1em;
`
const Line = styled.div`
    padding-bottom: 0.5em;
`
const DupLine = styled.div`
    padding-bottom: 0.5em;
`

const Atom = styled.span`
`
const DupFunctor = styled.span`
    color: #999;
`

const Placeholder = styled.span`
    display: inline-block;
    height: 0.8em;
    width: 0.8em;
    background-color: #ccc;
    border-radius: 4px;
`

const TermWrap = styled.span`
`

const Terms = ({ children }) =>
    h(TermWrap, {}, ['(', children, ')'])

const EndRule = styled.span``

const SelectedIf = ({ selected, children }) => selected
    ? h(Selected, [children])
    : children

const FactLine = ({ selection, dup, values: [functor, ...terms] }) =>
    h(dup ? DupLine : Line, [
        h(SelectedIf, { selected: selection === 0 }, [
            h(dup ? DupFunctor : Atom, [functor || h(Placeholder)]),
        ]),
        h(Terms, [
            ...terms.map((term, i) =>
                h(SelectedIf, { key: i, selected: selection === i + 1 }, [
                    term || h(Placeholder),
                ])),
        ]),
        h(EndRule, ['.']),
    ])

export const FactBlock = ({ selectionPath, lines }) =>
    h(Block, lines.map((line, i) => [
        h(FactLine, {
            selection: selectionPath[0] === i ? selectionPath[1] : null,
            dup: line[0] === (lines[i - 1] || [])[0],
            values: line,
        }),
    ]))
