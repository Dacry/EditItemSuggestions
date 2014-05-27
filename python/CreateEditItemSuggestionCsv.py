import argparse
from editItemSuggestions.parser import CsvReader
from editItemSuggestions.utils.datatypes import Entity, Claim
from editItemSuggestions.utils.CompressedFileType import CompressedFileType
from editItemSuggestions.analyzer import TableEntitiesGenerator
from collections import defaultdict

maxSuggestions = 500 # threshold that suggestions in the results have to pass
ProbabilityThreshold = 0.2
minNumberStatements = 4

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="this program generates a Edit-Item-Suggestions-Table")
    parser.add_argument("input", help="The CSV input file (wikidata triple)", type=CompressedFileType('r'))
    parser.add_argument("output", help="The CSV output file (database triples: pid;qid;probablilit)")
    args = parser.parse_args()

    print "computing table..."

    generator = CsvReader.read_csv(args.input)

    table, entities = TableEntitiesGenerator.compute_table(generator)

    editItemSuggestionsTable = defaultdict(list)

    itemCount=0

    for entity in entities:
        propList = list(entities[entity])
        if len(propList) > minNumberStatements:
            itemCount +=1
            if itemCount%1000 == 0:
                print str(itemCount)
            for pid1 in table:
                if pid1 not in propList:
                    probabilitySum = 0
                    for pid2 in propList:
                        probabilitySum += table[pid2][pid1]/float(table[pid2]["appearances"])
                    averageProbability = probabilitySum/len(propList)
                    if averageProbability > ProbabilityThreshold:
                        suggestionList = editItemSuggestionsTable[pid1]
                        if len(suggestionList) < maxSuggestions:
                            suggestionList.append((averageProbability, entity))
                        elif min(suggestionList)[0] < averageProbability:
                                suggestionList[suggestionList.index(min(suggestionList))] = (averageProbability, entity)
    #print editItemSuggestionsTable
    outputFile = open(args.output, "w")
    for prop, entityList in editItemSuggestionsTable.iteritems():
        for probability, entity in entityList:
            outputFile.write(str(prop) + "," + entity[1:] + "," + str(probability) + "\n")
    outputFile.close()
