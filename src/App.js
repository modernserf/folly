import React, { Component, Fragment } from 'react'
import shortid from 'shortid'
import { createStore, combineReducers } from 'redux'
import { Provider, connect } from 'react-redux'
import styled from 'styled-components'
import './App.css'

const where = (xs, query) =>
    xs.filter((x) => Object.entries(query).every(([k, v]) => x[k] === v))

export const viewStates = ['view', 'edit']
export const runStates = ['active', 'disabled']

const List = ({ data, children, ...props }) =>
    <ul {...props}>{data.map((d) => (
        <li key={d.id}>{children(d)}</li>
    ))}</ul>

function facts ({ label, items }) {
    let parentID = shortid.generate()
    return [
        { id: parentID, label, type: 'fact-group' },
        ...items.map((x) =>
            ({
                id: shortid.generate(),
                parentID,
                label: x,
                type: 'fact',
                viewState: 'view',
                runState: 'active',
            })
        ),
    ]
}

const stations = facts({
    label: 'Stations',
    items: [
        'Alewife',
        'Davis',
        'Porter',
        'Harvard',
        'Central',
        'Kendall',
        'Charles/MGH',
        'Park St',
        'Downtown Crossing',
        'South Station',
        'Broadway',
        'Andrew',
        'JFK/UMass',
    ],
})

const lines = facts({
    label: 'Lines',
    items: [
        'Red',
        'Blue',
        'Orange',
        'Green',
    ],
})

const Container = styled.section`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    header {
        border-radius: 1em 1em 0 0;
        padding: 0.5em;
        color: white;
        background-color: black;
        display: inline-block;
    }
`

const FactList = styled(List)`
    min-width: 50vw;
    border: 1px solid black;
    padding: 0.5em;
    border-radius: 0 1em 1em 1em;
    &>li+li {
        margin-top: 0.5em;
    }
`

const FactRowContainer = styled.div`
    display: flex;
    button {
        appearance: none;
        border: none;
        text-decoration: underline;
    }
`

const FactRowLabel = styled.span`
    flex: 1 0 auto;
`

const FactActions = styled.span`
    flex: 0 0 auto;
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
    setBuffer = (e) => {
        this.setState({ value: e.target.value })
    }
    render () {
        return (
            <form onSubmit={(e) => { e.preventDefault(); this.updateFact() }}>
                <input ref={(el) => { this.input = el }}
                    value={this.state.value}
                    onChange={this.setBuffer}
                    onBlur={this.updateFact}
                />
            </form>
        )
    }
})

const FactRow = connect(
    ({ data }, { id }) => ({
        item: where(data, { id })[0],
    })
)(class FactRow extends Component {
    render () {
        const { id, item, dispatch } = this.props
        return (
            <FactRowContainer>
                {{
                    edit: () => <EditFactRow id={id} />,
                    view: () => <FactRowLabel>{item.label}</FactRowLabel>,
                }[item.viewState]()}
                <FactActions>
                    <button
                        onClick={() => dispatch('editItem', id)}
                    >Edit</button>
                    <button
                        onClick={() => dispatch('disableItem', id)}
                    >Disable</button>
                    <button
                        onClick={() => dispatch('deleteItem', id)}
                    >Delete</button>
                </FactActions>
            </FactRowContainer>
        )
    }
})

const FactGroup = connect(
    ({ data }, { id }) => ({
        parent: where(data, { id })[0],
        items: where(data, { type: 'fact', parentID: id }),
    })
)(class FactGroup extends Component {
    render () {
        const { id, parent, items, dispatch } = this.props

        return (
            <Fragment>
                <Container>
                    <header>
                        <h1>{parent.label}</h1>
                    </header>
                    <FactList data={items}>{(x) => (
                        <FactRow id={x.id} />
                    )}</FactList>
                </Container>
                <button onClick={() => dispatch('createFact', { parentID: id })}>New Fact</button>
            </Fragment>
        )
    }
})

const AppBody = styled(List)`
    font-family: "Parc Place";
    font-size: 12px;
    &>li {
        margin: 1em;
    }
`

const App = connect(
    ({ data }) => ({ groups: where(data, { type: 'fact-group' }) })
)(class App extends Component {
    render () {
        const { groups, dispatch } = this.props
        return (
            <Fragment>
                <AppBody data={groups}>{(f) => (
                    <FactGroup id={f.id} />
                )}</AppBody>
                <button
                    onClick={() => dispatch('createList')}
                >New List</button>
            </Fragment>
        )
    }
})

const initState = {
    data: [...stations, ...lines],
}

const dataReducer = (state = [], { type, payload }) => {
    switch (type) {
    case 'createList': {
        return state.concat([
            { id: shortid.generate(), label: 'New List', type: 'fact-group' },
        ])
    }
    case 'createFact': {
        return state.concat([
            {
                id: shortid.generate(),
                parentID: payload.parentID,
                label: '',
                type: 'fact',
                viewState: 'edit',
                runState: 'active',
            },
        ])
    }
    case 'editItem': {
        return state.map((d) => d.id === payload ? ({...d, viewState: 'edit'}) : d)
    }
    case 'updateFact': {
        return state.map((d) => d.id === payload.id ? ({
            ...d,
            label: payload.value || 'New Fact',
            viewState: 'view',
        }) : d)
    }
    case 'deleteItem': {
        return state.filter((d) => d.id !== payload)
    }
    default:
        return state
    }
}

const rootReducer = combineReducers({
    data: dataReducer,
})

const store = createStore(rootReducer, initState)

const _dispatch = store.dispatch
store.dispatch = (type, payload) => {
    if (typeof type === 'string') {
        _dispatch({ type, payload })
    } else {
        _dispatch(type)
    }
}

const Root = () => <Provider store={store}><App /></Provider>

export default Root
