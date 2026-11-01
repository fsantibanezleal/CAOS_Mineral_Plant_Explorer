# Public delivery and site commissioning

The single public target is GitHub Pages at orebridge.fasl-work.com. The client build identifies version and exact commit in build.json. Static replay artifacts carry their own content hashes. A release requires CI for that commit, completed Pages deployment and direct inspection of served version, routes and artifact hashes.

The optional FastAPI/OPC gateway is a site-local tool configured outside the public bundle. It is not a second public hosted copy. Node identifiers, credentials and private certificates stay local. Public HTTP success or a rendered synthetic scene does not prove a site source connection. Site commissioning needs the actual graph mapping, source/time policy, authorized read access and owner acceptance.
