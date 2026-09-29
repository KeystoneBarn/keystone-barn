"""Offline check of the "Animal Service Providers" doc -> Who to Call transform.

DOC is the page's markdown as read from ClickUp on 2026-09-28.

    python3 backend/scripts/test_contacts_live.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

import contacts_live as cl  # noqa: E402

DOC = """# Animal Service Providers
Shareable directory for house sitters, dog sitters, and barn help.

* * *

## Small Animal Vet
**Forest Lake Veterinary Hospital**
*   Dr. Kiva Rudd
*   651-464-2752
*   19861 Fitzgerald Tr N, Forest Lake, MN 55025
*   [forestlakevet.com](https://www.forestlakevet.com)
## Equine Vet
**Stillwater Equine Vet Clinic**
*   Dr. Jon Engstrom
*   651-775-7623
*   9550 60th St N, Stillwater, MN 55082
*   [stillwaterequine.com](https://www.stillwaterequine.com/site/home)
## Equine Nutrition Consultant
**Dr. Erin Wilson** (Nutrena/Cargill)
*   317-509-8308
## Farrier
**Krystyna & Maria Eischens** (June 2026+)
*   763-482-6069
*   Venmo: [venmo.com/u/Krystyna-Eischens](https://venmo.com/u/Krystyna-Eischens)
## Chiropractor
**Dr. Hal Brown**
*   651-247-1769
## Dog Behaviorist
**Brian Munro, LFDM-B, CBCC-KA, CPDT-KA**
*   Leaps and Hounds Behavior
*   612-306-9684
*   [leapsandhoundsbehavior.com](http://leapsandhoundsbehavior.com)
*   Hours: Tue-Sat 9am-5pm
## Goat Vet
**Osceola Veterinary Service**
*   Dr. Oscarson
*   _(phone number not on file, check initial well visit invoice)_
## Emergency
**BluePearl Emergency Vet** (Arden Hills)
*   763-878-8494

**ASPCA Animal Poison Control**
*   888-426-4435
*   [aspca.org/pet-care/animal-poison-control](https://www.aspca.org/pet-care/animal-poison-control)"""


def main():
    cs = cl.parse(DOC)
    by = {c["name"]: c for c in cs}
    assert len(cs) == 9, [c["name"] for c in cs]
    vet = by["Stillwater Equine Vet Clinic"]
    assert (vet["role"], vet["person"], vet["phone"]) == ("Equine Vet", "Dr. Jon Engstrom", "651-775-7623"), vet
    assert vet["address"].startswith("9550") and vet["url"].startswith("https://www.stillwaterequine")
    far = by["Krystyna & Maria Eischens"]
    assert far["detail"] == "June 2026+ · Venmo: venmo.com/u/Krystyna-Eischens", far
    assert by["Dr. Erin Wilson"]["detail"] == "Nutrena/Cargill"
    goat = by["Osceola Veterinary Service"]
    assert goat["phone"] is None and "not on file" in goat["detail"], goat
    assert by["Brian Munro, LFDM-B, CBCC-KA, CPDT-KA"]["detail"] == "Leaps and Hounds Behavior · Hours: Tue-Sat 9am-5pm"
    em = [c["name"] for c in cs if c["role"] == "Emergency"]
    assert em == ["BluePearl Emergency Vet", "ASPCA Animal Poison Control"], em
    assert by["ASPCA Animal Poison Control"]["phone"] == "888-426-4435"
    print("contacts_live ok:", len(cs), "contacts")


if __name__ == "__main__":
    main()
