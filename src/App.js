import { Component, Fragment } from 'react'
import h from 'react-hyperscript'
import { Provider, connect } from 'react-redux'
import styled from 'styled-components'
import { Swipeable } from 'react-touch'
import { store } from './data'
import './App.css'

const where = (xs, query) =>
    xs.filter((x) => Object.entries(query).every(([k, v]) => x[k] === v))

const match = (value, options) => options[value]()

const List = ({ data, children, ...props }) =>
    h('ul', props, data.map((d) =>
        h('li', { key: d.id }, children(d))))

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

const DisabledFactGroupHeader = styled(BaseHeader)`
    border-radius: 1em;
    background-color: gray;
`

const FactList = styled(List)`
    border: 1px solid black;
    padding: 0.5em;
    border-radius: 0 1em 1em 1em;
    &>li+li {
        margin-top: 0.5em;
    }
`

const FactRowContainer = styled.div`
`

const FactRowLabel = styled.div`
    flex: 1 0 auto;
    color: ${({ disabled }) => disabled ? '#ccc' : 'black'};
`

const FactInput = styled.input`
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
    ({ data }, { id }) => ({ value: where(data, { id })[0].label }),
)(class EditFactRow extends Component {
    state = {
        value: '',
    }
    componentDidMount () {
        this.setState({ value: this.props.value })
        this.input.focus()
        setTimeout(() => this.input.select(), 1)
    }
    updateFact = () => {
        this.props.dispatch('updateFact', { value: this.state.value, id: this.props.id })
    }
    createAndNext = (e) => {
        e.preventDefault()
        this.props.dispatch('updateAndCreateNextFact', { value: this.state.value, id: this.props.id })
    }
    setBuffer = (e) => {
        this.setState({ value: e.target.value })
    }
    render () {
        return h('form', { onSubmit: this.createAndNext }, [
            h(FactInput, {
                innerRef: (el) => { this.input = el },
                value: this.state.value,
                onChange: this.setBuffer,
                onBlur: this.updateFact,
            }),
        ])
    }
})

const ViewFactRow = connect(
    ({ data }, { id }) => ({
        item: where(data, { id })[0],
    })
)(({ id, item, dispatch }) =>
    h(Swipeable, { onSwipeLeft: () => dispatch('disableItem', { id }) }, [
        h(FactRowLabel, {
            disabled: item.runState === 'disabled',
            onClick: () => dispatch('editItem', { id }),
            children: item.label,
        }),
    ])
)

const FactRow = connect(
    ({ data }, { id }) => ({
        viewState: where(data, { id })[0].viewState,
    })
)(({ id, viewState }) =>
    h(FactRowContainer, [
        match(viewState, {
            edit: () => h(EditFactRow, { id }),
            view: () => h(ViewFactRow, { id }),
        }),
    ]))

const NewFactButton = styled.button`
    appearance: none;
    border: none;
    font: inherit;
    text-decoration: underline;
`

const DisabledFactGroup = ({ id, parent, dispatch }) =>
    h(Swipeable, { onSwipeLeft: () => dispatch('disableItem', { id }) }, [
        h('div', [
            h(DisabledFactGroupHeader, [
                h('h1', parent.label),
            ]),
        ]),
    ])

const ActiveFactGroup = ({ id, parent, items, dispatch }) =>
    h(Fragment, [
        h(FactGroupContainer, [
            h(Swipeable, { onSwipeLeft: () => dispatch('disableItem', { id }) }, [
                h('div', [
                    h(FactGroupHeader, [
                        h('h1', [parent.label]),
                    ]),
                ]),
            ]),
            h(FactList, { data: items }, ({ id }) =>
                h(FactRow, { id })),
        ]),
        h(NewFactButton, { onClick: () => dispatch('createFact', { parentID: id }) }, [
            '+ New Fact',
        ]),
    ])

const FactGroup = connect(
    ({ data }, { id }) => ({
        parent: where(data, { id })[0],
        items: where(data, { type: 'fact', parentID: id }),
    })
)((props) => match(props.parent.runState, {
    active: () => h(ActiveFactGroup, props),
    disabled: () => h(DisabledFactGroup, props),
}))

const AppBody = styled.div`
    font-family: "Comic Sans MS", sans-serif;
    font-size: 16px;
    line-height: 18px;
`

const AppContent = styled(List)`
    &>li {
        margin: 1em;
    }
    padding-bottom: 100px;
`

const Footer = styled.footer`
    position: fixed;
    bottom: 0;
    right: 0;
    background-color: rgba(255,255,255,0.9);
    border-top: 1px solid #ccc;
    width: 100%;
    padding: 0.5em;
`

const NewListButton = styled.button`
    appearance: none;
    border: none;
    font: inherit;
    text-decoration: underline;
`

const App = connect(
    ({ data }) => ({ groups: where(data, { type: 'fact-group' }) })
)(({ groups, dispatch }) => (
    h(AppBody, [
        h(AppContent, { data: groups }, ({ id }) =>
            h(FactGroup, { id })),
        h(Footer, [
            h(NewListButton, { onClick: () => dispatch('createList') }, [
                '+ New List',
            ]),
        ]),
    ])
))

const Root = () => h(Provider, { store }, h(App))

export default Root
