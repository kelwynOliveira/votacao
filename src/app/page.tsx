import Link from 'next/link';
import { getPublicVotings } from './actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

export const dynamic = 'force-dynamic';

export default async function Home(props: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page) || 1;
  const status = (searchParams.status || 'all') as 'all' | 'open' | 'closed';
  const { votings, totalPages, currentPage } = await getPublicVotings({ page, limit: 5, status });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Votação
          </h1>
          <Link href="/login">
            <Button variant="outline" size="sm">Admin Login</Button>
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Votações Recentes</h2>
          <p className="text-gray-600">
            Confira abaixo as votações ativas e encerradas. Clique para ver detalhes ou votar.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex justify-center gap-2 mb-6">
          <Link href={`/?status=all&page=1`}>
            <Button variant={status === 'all' ? 'default' : 'outline'} size="sm">
              Todas
            </Button>
          </Link>
          <Link href={`/?status=open&page=1`}>
            <Button variant={status === 'open' ? 'default' : 'outline'} size="sm">
              Abertas
            </Button>
          </Link>
          <Link href={`/?status=closed&page=1`}>
            <Button variant={status === 'closed' ? 'default' : 'outline'} size="sm">
              Fechadas
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {votings.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              Nenhuma votação encontrada no momento.
            </div>
          ) : (
            votings.map((voting) => (
              <Link href={`/vote/${voting.id}`} key={voting.id} className="block group">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent group-hover:border-l-blue-600">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-800">
                      {voting.title}
                    </CardTitle>
                    <Badge variant={voting.isOpen ? 'default' : 'destructive'} className={voting.isOpen ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
                      {voting.isOpen ? 'Aberta' : 'Fechada'}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-500 flex justify-between">
                      <span>{new Date(voting.createdAt).toLocaleDateString('pt-BR')}</span>
                      <span>{voting._count.voteLogs} votos registrados</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8">
            <Pagination>
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious href={`/?status=${status}&page=${currentPage - 1}`} />
                  </PaginationItem>
                )}
                
                {Array.from({ length: totalPages }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink href={`/?status=${status}&page=${i + 1}`} isActive={currentPage === i + 1}>
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationNext href={`/?status=${status}&page=${currentPage + 1}`} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </main>
    </div>
  );
}
