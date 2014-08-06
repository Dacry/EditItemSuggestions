from collections import defaultdict
from editItemSuggestions.utils.datatypes import Entity


def compute_table(generator):
    """
    @type entities: collections.Iterable[Entity]
    @return: dict[int, dict], dict[string, int]
    """
    table = defaultdict(lambda:  defaultdict(int))
    entities = {}
    for i, entity in enumerate(generator):
        if i % 100000 == 0 and i > 0:
            print "entities {0}".format(i)

        for claim in entity.claims:
            if not claim.property_id in table or table[claim.property_id]["type"] == "unknown":
                table[claim.property_id]["type"] = claim.datatype

        distinct_ids = set(claim.property_id for claim in entity.claims)
        entities[entity.title] = distinct_ids
        for pid1 in distinct_ids:
            table[pid1]["appearances"] += 1
            for pid2 in distinct_ids:
                if pid1 != pid2:
                    table[pid1][pid2] += 1
    return table, entities
