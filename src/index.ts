import Person from './__types__/Person'

export function whoIsYounger(personA: Person, personB: Person): Person {
  return personA.age < personB.age ? personA : personB
}

if (typeof require !== 'undefined' && require.main === module) {
  console.log(whoIsYounger({name: 'John', age: 20}, {name: 'Jane', age: 30}))
}
