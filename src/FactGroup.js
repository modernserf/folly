import { Fragment } from 'react'
import h from 'react-hyperscript'
import { connect } from 'react-redux'
import styled from 'styled-components'
import { Swipeable } from 'react-touch'
import { List, TextForm, any } from './helpers'
import FactRow from './FactRow'

const FactGroupInput = styled(TextForm)`
    display: block;
    width: 100%;
    border: 0;
    padding: 0;
    margin: 0;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    color: black;
    background-color: white;
`

const EditFactGroup = connect()(({ id, dispatch }) => h(FactGroupInput, {
    initialValue: id,
    onBlur: (value) => dispatch('updateFactGroup', { id, value }),
    onSubmit: (value) => dispatch('updateFactGroup', { id, value }),
}))

const FactGroupContainer = styled.section`
    padding-bottom: 0.5em;
`

const BaseHeader = styled.header`
    padding: 0.5em;
    color: white;
    display: inline-block;
`

const FactGroupHeader = styled(BaseHeader)`
    border-radius: 1em 1em 0 0;
    background-color: black;
`

const FactList = styled(List)`
    border: 1px solid black;
    padding: 0.5em;
    border-radius: 0 1em 1em 1em;
    &>li+li {
        margin-top: 0.5em;
    }
`

const NewFactButton = styled.button`
    appearance: none;
    border: none;
    font: inherit;
    text-decoration: underline;
`

const ActiveFactGroup = ({ id, edit, children, dispatch }) =>
    h(Fragment, [
        h(FactGroupContainer, [
            h(Swipeable, { onSwipeLeft: () => dispatch('disableItem', { id }) }, [
                h('div', [
                    h(FactGroupHeader, { onClick: () => dispatch('editItem', { id }) }, [
                        edit ? h(EditFactGroup, { id }) : h('h1', [id]),
                    ]),
                ]),
            ]),
            h(FactList, { data: children }, (childID) =>
                h(FactRow, { id: childID, parentID: id })),
        ]),
        h(NewFactButton, { onClick: () => dispatch('createFact', { parentID: id }) }, [
            '+ New Fact',
        ]),
    ])

const DisabledFactGroupHeader = styled(BaseHeader)`
    border-radius: 1em;
    background-color: gray;
`

const DisabledFactGroup = ({ id, dispatch }) =>
    h(Swipeable, { onSwipeLeft: () => dispatch('disableItem', { id }) }, [
        h('div', [
            h(DisabledFactGroupHeader, [h('h1', id)]),
        ]),
    ])

const FactGroup = connect(
    (db, { id }) => ({
        children: db.findAll(id, 'children'),
        disabled: any(db.query(() => [['disabled', id]])),
        edit: any(db.query(() => [['edit', id]])),
    })
)((props) => props.disabled ? h(DisabledFactGroup, props) : h(ActiveFactGroup, props))

export default FactGroup
