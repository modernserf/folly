import h from 'react-hyperscript'
import styled from 'styled-components'
import { storiesOf } from '@storybook/react'
import { DevContainer } from './story'

/*
options for type
options for type
options for type
+ var  | bound vars
+ text | + num | + form | hide
*/

const FlexMulti = styled.div`
    display: flex;
    flex-wrap: wrap;
`

const Key = styled.div`
    padding: 0.5em;
    flex: 1 1 auto;
    text-align: center;
    margin: 2px;
    border-radius: 2px;
    background-color: #eee;
`

const VarRow = styled.div`
    display: flex;
    margin: 3px 0;
`

const ActionRow = styled.div`
    display: flex;
`

const AddKey = styled(Key)`
    flex: 0 0 auto;
    color: white;
    background-color: #666;
    padding: 0.5em 1em;
`

const HideWrap = styled.div`
    display: flex;
    flex: 1 0 auto;
    justify-content: flex-end;
`

const HideKey = styled(Key)`
    padding: 0.5em 1em;
    flex: 0 0 auto;
`

const StructureKeyboard = ({ options, vars }) => h('div', [
    h(FlexMulti, options.map(({ id, value }) => h(Key, { key: id }, [value]))),
    h(VarRow, [
        h(AddKey, ['+Var']),
        ...vars.map((id) => h(Key, { key: id }, [id])),
    ]),
    h(ActionRow, [
        h(AddKey, ['+Text']),
        h(AddKey, ['+Num']),
        h(AddKey, ['+Form']),
        h(HideWrap, [
            h(HideKey, ['Hide']),
        ]),
    ]),
])

const stations = [
    { id: 'park', value: 'Park Street' },
    { id: 'downtown', value: 'Downtown Crossing' },
    { id: 'south', value: 'South Station' },
    { id: 'haymarket', value: 'Haymarket' },
    { id: 'govt', value: 'Government Center' },
    { id: 'state', value: 'State Street' },
    { id: 'aquarium', value: 'Aquarium' },
].map((s) => ({
    ...s,
    type: 'text',
}))

const lines = [
    { id: 'red', value: 'Red' },
    { id: 'green', value: 'Green' },
    { id: 'blue', value: 'Blue' },
    { id: 'orange', value: 'Orange' },
].map((s) => ({
    ...s,
    type: 'text',
}))

const options = [...stations, ...lines]

const vars = ['Left', 'Right', 'H', 'T']

storiesOf('StructureKeyboard', module)
    .add('layout', () => h(DevContainer, { width: '400px' }, [
        h(StructureKeyboard, { options, vars }),
    ]))
