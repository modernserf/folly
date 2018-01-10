import h from 'react-hyperscript'
import { connect } from 'react-redux'
import styled from 'styled-components'
import { Swipeable } from 'react-touch'
import { any, Autocomplete, TextForm } from './helpers'

const FloatingAutocomplete = styled(Autocomplete)`
    position:fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    display: flex;
    z-index: 1;
    overflow: scroll;
    button {
        appearance:none;
        border: 1px solid black;
        font-family: inherit;
        font-size: inherit;
        white-space: nowrap;
        background-color: white;
    }
`

const FactInput = styled(TextForm)`
    display: block;
    width: 100%;
    border: 0;
    padding: 0;
    margin: 0;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    color: white;
    background-color: black;
`

const EditFactRow = connect(
    (db, { id }) => ({
        options: [...db.query((q) => [
            [q.parent, 'type', 'fact_group'],
            [q.parent, 'children', q.id],
        ])].map(({ id }) => ({ id, label: id })),
    }),
)(({ id, parentID, initialValue, options, dispatch }) => h(FactInput, {
    initialValue: id,
    onBlur: (value) => dispatch('updateFact', { value, id, parentID }),
    onSubmit: (value) => dispatch('updateAndCreateNextFact', { value, id, parentID }),
}, ({ value }) => h(FloatingAutocomplete, {
    value,
    options,
    onChange: (x) => dispatch('updateFact', { value: x, id, parentID }),
})))

const FactRowLabel = styled.div`
    flex: 1 0 auto;
    color: ${({ disabled }) => disabled ? '#ccc' : 'black'};
`

const ViewFactRow = connect(
    (db, { id, parentID }) => ({
        disabled: any(db.query(() => [['disabled', parentID, id]])),
    })
)(({ id, parentID, disabled, dispatch }) =>
    h(Swipeable, { onSwipeLeft: () => dispatch('disableItem', { parentID, id }) }, [
        h(FactRowLabel, {
            disabled,
            onClick: () => dispatch('editItem', { parentID, id }),
        }, id),
    ])
)

const FactRowContainer = styled.div`
`

const FactRow = connect(
    (db, { parentID, id }) => ({ edit: any(db.query(() => [['edit', parentID, id]])) }),
)(({ id, parentID, edit }) =>
    h(FactRowContainer, [
        edit ? h(EditFactRow, { id, parentID }) : h(ViewFactRow, { id, parentID }),
    ]))

export default FactRow
